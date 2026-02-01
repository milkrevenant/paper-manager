use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPage {
    pub id: String,
    pub paper_id: String,
    pub page_number: i32,
    pub text_content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullTextSearchResult {
    pub paper_id: String,
    pub paper_title: String,
    pub paper_author: String,
    pub page_number: i32,
    pub snippet: String,
    pub rank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullTextSearchQuery {
    pub query: String,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullTextSearchResponse {
    pub total: i32,
    pub results: Vec<FullTextSearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexingStatus {
    pub paper_id: String,
    pub total_pages: i32,
    pub indexed_pages: i32,
    pub is_complete: bool,
    pub error: Option<String>,
}
