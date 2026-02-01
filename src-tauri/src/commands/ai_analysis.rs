use crate::db::DbConnection;
use crate::error::AppError;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::State;

const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const GEMINI_PROMPT: &str = r#"당신은 학술 논문 분석 전문가입니다. 논문을 읽고 다음 JSON 형식으로 응답하세요.

[지침]
- 발행처에 학위구분(석사/박사) 포함
- 연구대상 요약
- 한국어로 작성
- 각 배열 필드는 최대 10개까지

JSON 구조:
{
  "keywords": "",
  "author": "",
  "year": "",
  "title": "",
  "publisher": "",
  "subject": "",
  "purposes": [],
  "isQualitative": true/false,
  "isQuantitative": true/false,
  "qualTools": [],
  "varsIndependent": [],
  "varsDependent": [],
  "varsModerator": [],
  "varsMediator": [],
  "varsOthers": [],
  "quantTechniques": [],
  "results": [],
  "limitations": [],
  "implications": [],
  "futurePlans": []
}"#;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub keywords: Option<String>,
    pub author: Option<String>,
    pub year: Option<String>,
    pub title: Option<String>,
    pub publisher: Option<String>,
    pub subject: Option<String>,
    pub purposes: Option<Vec<String>>,
    pub is_qualitative: Option<bool>,
    pub is_quantitative: Option<bool>,
    pub qual_tools: Option<Vec<String>>,
    pub vars_independent: Option<Vec<String>>,
    pub vars_dependent: Option<Vec<String>>,
    pub vars_moderator: Option<Vec<String>>,
    pub vars_mediator: Option<Vec<String>>,
    pub vars_others: Option<Vec<String>>,
    pub quant_techniques: Option<Vec<String>>,
    pub results: Option<Vec<String>>,
    pub limitations: Option<Vec<String>>,
    pub implications: Option<Vec<String>>,
    pub future_plans: Option<Vec<String>>,
}

// Gemini API request/response types
#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
#[serde(untagged)]
enum GeminiPart {
    Text { text: String },
    InlineData { inline_data: GeminiInlineData },
}

#[derive(Serialize)]
struct GeminiInlineData {
    mime_type: String,
    data: String,
}

#[derive(Serialize)]
struct GeminiGenerationConfig {
    temperature: f32,
    #[serde(rename = "responseMimeType")]
    response_mime_type: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
    error: Option<GeminiError>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(Deserialize)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Deserialize)]
struct GeminiResponsePart {
    text: String,
}

#[derive(Deserialize)]
struct GeminiError {
    message: String,
}

/// Analyze a paper's PDF using Gemini AI
#[tauri::command]
pub async fn analyze_paper(
    paper_id: String,
    db: State<'_, DbConnection>,
) -> Result<AnalysisResult, AppError> {
    // 1. Get Gemini API key from settings
    let api_key = {
        let conn = db.get()?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'")?;
        let key: Option<String> = stmt
            .query_row([], |row| row.get(0))
            .ok();
        key
    };

    let api_key = api_key.ok_or_else(|| {
        AppError::Analysis("Gemini API 키가 설정되지 않았습니다. Settings에서 API 키를 입력해주세요.".to_string())
    })?;

    if api_key.is_empty() {
        return Err(AppError::Analysis("Gemini API 키가 비어있습니다.".to_string()));
    }

    // 2. Get paper info and PDF path
    let (pdf_path, current_title): (Option<String>, String) = {
        let conn = db.get()?;
        let mut stmt = conn.prepare("SELECT pdf_path, title FROM papers WHERE id = ?")?;
        stmt.query_row([&paper_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
    };

    let pdf_path = pdf_path.ok_or_else(|| {
        AppError::Analysis("이 논문에는 PDF 파일이 없습니다.".to_string())
    })?;

    // 3. Read PDF file and encode to base64
    let pdf_bytes = fs::read(&pdf_path).map_err(|e| {
        AppError::Analysis(format!("PDF 파일을 읽을 수 없습니다: {}", e))
    })?;

    let base64_pdf = STANDARD.encode(&pdf_bytes);

    // 4. Call Gemini API
    let client = reqwest::Client::new();

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![
                GeminiPart::Text {
                    text: GEMINI_PROMPT.to_string(),
                },
                GeminiPart::InlineData {
                    inline_data: GeminiInlineData {
                        mime_type: "application/pdf".to_string(),
                        data: base64_pdf,
                    },
                },
            ],
        }],
        generation_config: GeminiGenerationConfig {
            temperature: 0.1,
            response_mime_type: "application/json".to_string(),
        },
    };

    let url = format!("{}?key={}", GEMINI_API_URL, api_key);

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::Analysis(format!("Gemini API 호출 실패: {}", e)))?;

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| AppError::Analysis(format!("Gemini 응답 파싱 실패: {}", e)))?;

    // Check for API error
    if let Some(error) = gemini_response.error {
        return Err(AppError::Analysis(format!("Gemini API 오류: {}", error.message)));
    }

    // Extract text from response
    let text = gemini_response
        .candidates
        .and_then(|c| c.into_iter().next())
        .map(|c| c.content.parts.into_iter().next())
        .flatten()
        .map(|p| p.text)
        .ok_or_else(|| AppError::Analysis("Gemini 응답이 비어있습니다.".to_string()))?;

    // 5. Parse JSON response (handle both array and single object)
    let result: AnalysisResult = {
        // Try parsing as array first
        if let Ok(arr) = serde_json::from_str::<Vec<AnalysisResult>>(&text) {
            arr.into_iter().next().ok_or_else(|| {
                AppError::Analysis("분석 결과 배열이 비어있습니다.".to_string())
            })?
        } else {
            // Fall back to single object
            serde_json::from_str(&text).map_err(|e| {
                AppError::Analysis(format!("분석 결과 파싱 실패: {}. 응답: {}", e, &text[..text.len().min(200)]))
            })?
        }
    };

    // 6. Update paper in database
    {
        let conn = db.get()?;

        let keywords = result.keywords.as_deref().unwrap_or("");
        let author = result.author.as_deref().unwrap_or("");
        let year: i32 = result.year.as_ref()
            .and_then(|y| y.parse().ok())
            .unwrap_or(0);
        let title = result.title.as_deref().unwrap_or(&current_title);
        let publisher = result.publisher.as_deref().unwrap_or("");
        let subject = result.subject.as_deref().unwrap_or("");

        // Serialize arrays to JSON strings
        let purposes = serde_json::to_string(&result.purposes.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let qual_tools = serde_json::to_string(&result.qual_tools.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let vars_independent = serde_json::to_string(&result.vars_independent.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let vars_dependent = serde_json::to_string(&result.vars_dependent.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let vars_moderator = serde_json::to_string(&result.vars_moderator.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let vars_mediator = serde_json::to_string(&result.vars_mediator.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let vars_others = serde_json::to_string(&result.vars_others.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let quant_techniques = serde_json::to_string(&result.quant_techniques.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let results_json = serde_json::to_string(&result.results.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let limitations = serde_json::to_string(&result.limitations.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let implications = serde_json::to_string(&result.implications.as_ref().unwrap_or(&vec![])).unwrap_or_default();
        let future_plans = serde_json::to_string(&result.future_plans.as_ref().unwrap_or(&vec![])).unwrap_or_default();

        let is_qualitative = result.is_qualitative.unwrap_or(false);
        let is_quantitative = result.is_quantitative.unwrap_or(false);

        conn.execute(
            "UPDATE papers SET
                keywords = ?,
                author = ?,
                year = ?,
                title = ?,
                publisher = ?,
                subject = ?,
                purposes = ?,
                is_qualitative = ?,
                is_quantitative = ?,
                qual_tools = ?,
                vars_independent = ?,
                vars_dependent = ?,
                vars_moderator = ?,
                vars_mediator = ?,
                vars_others = ?,
                quant_techniques = ?,
                results = ?,
                limitations = ?,
                implications = ?,
                future_plans = ?,
                last_analyzed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?",
            rusqlite::params![
                keywords,
                author,
                year,
                title,
                publisher,
                subject,
                purposes,
                is_qualitative,
                is_quantitative,
                qual_tools,
                vars_independent,
                vars_dependent,
                vars_moderator,
                vars_mediator,
                vars_others,
                quant_techniques,
                results_json,
                limitations,
                implications,
                future_plans,
                paper_id,
            ],
        )?;
    }

    Ok(result)
}

// ============================================================================
// Text-only AI functions (for summarization and translation)
// ============================================================================

/// Gemini API URL for text-only generation
const GEMINI_TEXT_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/// Helper function to call Gemini API with text-only input
async fn call_gemini_text(api_key: &str, prompt: &str) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    #[derive(Serialize)]
    struct TextRequest {
        contents: Vec<TextContent>,
        #[serde(rename = "generationConfig")]
        generation_config: TextGenerationConfig,
    }

    #[derive(Serialize)]
    struct TextContent {
        parts: Vec<TextPart>,
    }

    #[derive(Serialize)]
    struct TextPart {
        text: String,
    }

    #[derive(Serialize)]
    struct TextGenerationConfig {
        temperature: f32,
    }

    let request_body = TextRequest {
        contents: vec![TextContent {
            parts: vec![TextPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: TextGenerationConfig {
            temperature: 0.3, // Slightly higher for more natural text
        },
    };

    let url = format!("{}?key={}", GEMINI_TEXT_API_URL, api_key);

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::Analysis(format!("Gemini API 호출 실패: {}", e)))?;

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| AppError::Analysis(format!("Gemini 응답 파싱 실패: {}", e)))?;

    // Check for API error
    if let Some(error) = gemini_response.error {
        return Err(AppError::Analysis(format!("Gemini API 오류: {}", error.message)));
    }

    // Extract text from response
    let text = gemini_response
        .candidates
        .and_then(|c| c.into_iter().next())
        .map(|c| c.content.parts.into_iter().next())
        .flatten()
        .map(|p| p.text)
        .ok_or_else(|| AppError::Analysis("Gemini 응답이 비어있습니다.".to_string()))?;

    Ok(text)
}

/// Get Gemini API key from database
fn get_gemini_key(db: &DbConnection) -> Result<String, AppError> {
    let conn = db.get()?;
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'")?;
    let key: Option<String> = stmt
        .query_row([], |row| row.get(0))
        .ok();

    key.filter(|k| !k.is_empty())
        .ok_or_else(|| AppError::Analysis("Gemini API 키가 설정되지 않았습니다. Settings에서 API 키를 입력해주세요.".to_string()))
}

/// Summarize selected text using Gemini AI
#[tauri::command]
pub async fn summarize_text(
    text: String,
    db: State<'_, DbConnection>,
) -> Result<String, AppError> {
    let api_key = get_gemini_key(&db)?;

    if text.trim().is_empty() {
        return Err(AppError::Analysis("요약할 텍스트가 없습니다.".to_string()));
    }

    let prompt = format!(
        "다음 학술 텍스트를 한국어로 간결하게 요약해주세요. \
        핵심 내용만 3-5문장으로 정리해주세요. \
        학술 용어는 그대로 유지하되, 이해하기 쉽게 설명해주세요.\n\n\
        ---\n{}\n---",
        text
    );

    call_gemini_text(&api_key, &prompt).await
}

/// Translate selected text using Gemini AI
#[tauri::command]
pub async fn translate_text(
    text: String,
    target_lang: String,
    db: State<'_, DbConnection>,
) -> Result<String, AppError> {
    let api_key = get_gemini_key(&db)?;

    if text.trim().is_empty() {
        return Err(AppError::Analysis("번역할 텍스트가 없습니다.".to_string()));
    }

    // Only support Korean <-> English
    let (_lang_name, instruction) = match target_lang.as_str() {
        "en" => ("영어", "Translate the following academic text to English. Maintain academic terminology accurately."),
        "ko" => ("한국어", "다음 학술 텍스트를 한국어로 번역해주세요. 학술 용어는 정확하게 유지해주세요."),
        _ => ("영어", "Translate the following academic text to English. Maintain academic terminology accurately."),
    };

    let prompt = format!(
        "{}\n\n---\n{}\n---",
        instruction, text
    );

    call_gemini_text(&api_key, &prompt).await
}
