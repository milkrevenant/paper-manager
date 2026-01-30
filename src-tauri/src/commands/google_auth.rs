use crate::db::DbConnection;
use crate::error::AppError;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, State};

// Google OAuth configuration
// NOTE: These should be replaced with your actual Google Cloud Console credentials
const GOOGLE_CLIENT_ID: &str = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET: &str = "YOUR_GOOGLE_CLIENT_SECRET";
const REDIRECT_URI: &str = "http://localhost:8847/oauth/callback";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";

// Scopes for Google Drive and user info
const SCOPES: &str = "openid email profile https://www.googleapis.com/auth/drive.file";

// OAuth state for PKCE flow
static OAUTH_STATE: Mutex<Option<OAuthState>> = Mutex::new(None);

#[derive(Debug, Clone)]
struct OAuthState {
    state: String,
    code_verifier: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: i64,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    id_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserInfo {
    email: String,
}

// Generate cryptographically secure random string
fn generate_random_string(length: usize) -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..length).map(|_| rng.gen()).collect();
    URL_SAFE_NO_PAD.encode(&bytes)
}

// Generate PKCE code challenge from verifier using SHA256
fn generate_code_challenge(verifier: &str) -> String {
    use sha2::{Sha256, Digest};

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    URL_SAFE_NO_PAD.encode(&hash)
}

/// Start the Google OAuth flow - returns the authorization URL
#[tauri::command]
pub async fn start_google_oauth() -> Result<String, AppError> {
    // Generate PKCE values
    let state = generate_random_string(32);
    let code_verifier = generate_random_string(64);
    let code_challenge = generate_code_challenge(&code_verifier);

    // Store state for verification
    {
        let mut oauth_state = OAUTH_STATE.lock().unwrap();
        *oauth_state = Some(OAuthState {
            state: state.clone(),
            code_verifier,
        });
    }

    // Build authorization URL
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        AUTH_URL,
        urlencoding::encode(GOOGLE_CLIENT_ID),
        urlencoding::encode(REDIRECT_URI),
        urlencoding::encode(SCOPES),
        urlencoding::encode(&state),
        urlencoding::encode(&code_challenge)
    );

    Ok(auth_url)
}

/// Handle OAuth callback - exchange code for tokens
#[tauri::command]
pub async fn handle_google_oauth_callback(
    code: String,
    state: String,
    db: State<'_, DbConnection>,
) -> Result<GoogleTokens, AppError> {
    // Verify state
    let code_verifier = {
        let oauth_state = OAUTH_STATE.lock().unwrap();
        match &*oauth_state {
            Some(s) if s.state == state => s.code_verifier.clone(),
            _ => return Err(AppError::Auth("Invalid OAuth state".to_string())),
        }
    };

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_response = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", GOOGLE_CLIENT_ID),
            ("client_secret", GOOGLE_CLIENT_SECRET),
            ("code", &code),
            ("code_verifier", &code_verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", REDIRECT_URI),
        ])
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!("Token exchange failed: {}", error_text)));
    }

    let tokens: TokenResponse = token_response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // Get user email from userinfo endpoint
    let email = if let Some(_id_token) = &tokens.id_token {
        // Fetch user info
        let userinfo_response = client
            .get("https://www.googleapis.com/oauth2/v2/userinfo")
            .bearer_auth(&tokens.access_token)
            .send()
            .await
            .ok();

        if let Some(resp) = userinfo_response {
            resp.json::<UserInfo>().await.ok().map(|u| u.email)
        } else {
            None
        }
    } else {
        None
    };

    let expires_at = chrono::Utc::now().timestamp() + tokens.expires_in;

    let google_tokens = GoogleTokens {
        access_token: tokens.access_token.clone(),
        refresh_token: tokens.refresh_token.clone(),
        expires_at,
        email: email.clone(),
    };

    // Store tokens in database
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
    store_tokens(&conn, &google_tokens)?;

    // Store email in settings
    if let Some(email) = &email {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_account_email', ?1, datetime('now'))",
            [email],
        ).map_err(|e| AppError::Database(e.to_string()))?;
    }

    // Clear OAuth state
    {
        let mut oauth_state = OAUTH_STATE.lock().unwrap();
        *oauth_state = None;
    }

    Ok(google_tokens)
}

/// Get stored Google tokens
#[tauri::command]
pub fn get_google_tokens(db: State<'_, DbConnection>) -> Result<Option<GoogleTokens>, AppError> {
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
    load_tokens(&conn)
}

/// Refresh Google access token
#[tauri::command]
pub async fn refresh_google_token(db: State<'_, DbConnection>) -> Result<GoogleTokens, AppError> {
    // Load tokens first, then drop the connection before async calls
    let (current_tokens, refresh_token) = {
        let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
        let current = load_tokens(&conn)?
            .ok_or_else(|| AppError::Auth("No tokens stored".to_string()))?;
        let refresh = current
            .refresh_token
            .clone()
            .ok_or_else(|| AppError::Auth("No refresh token available".to_string()))?;
        (current, refresh)
    }; // conn is dropped here

    // Now make the async HTTP request
    let client = reqwest::Client::new();
    let token_response = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", GOOGLE_CLIENT_ID),
            ("client_secret", GOOGLE_CLIENT_SECRET),
            ("refresh_token", &refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!("Token refresh failed: {}", error_text)));
    }

    let tokens: TokenResponse = token_response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let expires_at = chrono::Utc::now().timestamp() + tokens.expires_in;

    let google_tokens = GoogleTokens {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token.or(Some(refresh_token)),
        expires_at,
        email: current_tokens.email,
    };

    // Reconnect to store tokens
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
    store_tokens(&conn, &google_tokens)?;

    Ok(google_tokens)
}

/// Revoke Google tokens and disconnect account
#[tauri::command]
pub async fn revoke_google_tokens(db: State<'_, DbConnection>) -> Result<(), AppError> {
    // Load tokens first, then drop the connection before async calls
    let access_token = {
        let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
        load_tokens(&conn)?.map(|t| t.access_token)
    }; // conn is dropped here

    // Revoke token with Google if we have one
    if let Some(token) = access_token {
        let client = reqwest::Client::new();
        let _ = client
            .post(REVOKE_URL)
            .form(&[("token", &token)])
            .send()
            .await;
    }

    // Reconnect to clear stored tokens
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
    conn.execute("DELETE FROM settings WHERE key LIKE 'google_%'", [])
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

/// OAuth callback data
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthCallback {
    pub code: String,
    pub state: String,
}

/// Start local OAuth callback server and wait for callback
#[tauri::command]
pub async fn start_oauth_server(app: tauri::AppHandle) -> Result<(), AppError> {
    use std::thread;

    let app_clone = app.clone();

    thread::spawn(move || {
        let server = match tiny_http::Server::http("127.0.0.1:8847") {
            Ok(s) => s,
            Err(e) => {
                log::error!("Failed to start OAuth server: {}", e);
                return;
            }
        };

        // Wait for a single request (the OAuth callback)
        if let Ok(request) = server.recv() {
            let url = request.url().to_string();

            // Parse callback parameters
            if url.starts_with("/oauth/callback") {
                // Parse query parameters
                let query_start = url.find('?').unwrap_or(url.len());
                let query_string = &url[query_start..];

                let mut code = None;
                let mut state = None;

                for pair in query_string.trim_start_matches('?').split('&') {
                    let mut parts = pair.splitn(2, '=');
                    if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                        match key {
                            "code" => code = Some(urlencoding::decode(value).unwrap_or_default().to_string()),
                            "state" => state = Some(urlencoding::decode(value).unwrap_or_default().to_string()),
                            _ => {}
                        }
                    }
                }

                if let (Some(code), Some(state)) = (code, state) {
                    // Emit event to frontend
                    let _ = app_clone.emit("oauth-callback", OAuthCallback {
                        code: code.clone(),
                        state: state.clone(),
                    });

                    // Send success response to browser
                    let response = tiny_http::Response::from_string(
                        r#"<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1 style="color: #22c55e;">&#10003; Authentication Successful!</h1>
    <p>You can close this window and return to Paper Manager.</p>
    <script>setTimeout(() => window.close(), 2000);</script>
</body>
</html>"#,
                    )
                    .with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap(),
                    );
                    let _ = request.respond(response);
                } else {
                    // Send error response
                    let response = tiny_http::Response::from_string(
                        r#"<!DOCTYPE html>
<html>
<head><title>Authentication Failed</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1 style="color: #ef4444;">Authentication Failed</h1>
    <p>Missing authorization code or state. Please try again.</p>
</body>
</html>"#,
                    )
                    .with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap(),
                    );
                    let _ = request.respond(response);
                }
            }
        }
    });

    Ok(())
}

// Helper functions for token storage
fn store_tokens(conn: &rusqlite::Connection, tokens: &GoogleTokens) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_access_token', ?1, datetime('now'))",
        [&tokens.access_token],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    if let Some(refresh_token) = &tokens.refresh_token {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_refresh_token', ?1, datetime('now'))",
            [refresh_token],
        ).map_err(|e| AppError::Database(e.to_string()))?;
    }

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_token_expires_at', ?1, datetime('now'))",
        [&tokens.expires_at.to_string()],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

fn load_tokens(conn: &rusqlite::Connection) -> Result<Option<GoogleTokens>, AppError> {
    let access_token: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'google_access_token'",
            [],
            |row| row.get(0),
        )
        .ok();

    let access_token = match access_token {
        Some(t) => t,
        None => return Ok(None),
    };

    let refresh_token: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'google_refresh_token'",
            [],
            |row| row.get(0),
        )
        .ok();

    let expires_at: i64 = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'google_token_expires_at'",
            [],
            |row| {
                let val: String = row.get(0)?;
                Ok(val.parse().unwrap_or(0))
            },
        )
        .unwrap_or(0);

    let email: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'google_account_email'",
            [],
            |row| row.get(0),
        )
        .ok();

    Ok(Some(GoogleTokens {
        access_token,
        refresh_token,
        expires_at,
        email,
    }))
}
