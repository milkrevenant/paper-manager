use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

fn main() {
    let mut loaded_vars: HashMap<String, String> = HashMap::new();

    // Load environment variables from .env file if it exists
    let env_path = Path::new(".env");
    if env_path.exists() {
        if let Ok(contents) = fs::read_to_string(env_path) {
            for line in contents.lines() {
                let line = line.trim();
                // Skip comments and empty lines
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                // Parse KEY=VALUE
                if let Some((key, value)) = line.split_once('=') {
                    let key = key.trim().to_string();
                    let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
                    // Set for compilation
                    println!("cargo:rustc-env={}={}", key, value);
                    loaded_vars.insert(key, value);
                }
            }
        }
    }

    // Ensure required environment variables are set (either from .env or shell)
    let required_vars = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
    for var in required_vars {
        let is_set = loaded_vars.contains_key(var) || env::var(var).is_ok();
        if !is_set {
            panic!(
                "\n\nRequired environment variable {} is not set.\n\
                Please create a .env file in src-tauri/ directory with:\n\n\
                GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com\n\
                GOOGLE_CLIENT_SECRET=your-client-secret\n\n",
                var
            );
        }
    }

    tauri_build::build()
}
