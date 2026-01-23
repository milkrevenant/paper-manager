use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Paper {
    pub id: String,
    pub folder_id: String,
    pub paper_number: i32,

    // Bibliographic info
    pub keywords: String,
    pub author: String,
    pub year: i32,
    pub title: String,
    pub publisher: String,
    pub subject: String,

    // Research design
    pub purposes: Vec<String>,
    pub is_qualitative: bool,
    pub is_quantitative: bool,

    // Qualitative
    pub qual_tools: Vec<String>,

    // Quantitative
    pub vars_independent: Vec<String>,
    pub vars_dependent: Vec<String>,
    pub vars_moderator: Vec<String>,
    pub vars_mediator: Vec<String>,
    pub vars_others: Vec<String>,
    pub quant_techniques: Vec<String>,

    // Results
    pub results: Vec<String>,
    pub limitations: Vec<String>,
    pub implications: Vec<String>,
    pub future_plans: Vec<String>,

    // File management
    pub pdf_path: String,
    pub pdf_filename: String,

    // User metadata
    pub user_notes: String,
    pub tags: Vec<String>,
    pub is_read: bool,
    pub importance: i32,

    // Timestamps
    pub created_at: String,
    pub updated_at: String,
    pub last_analyzed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaperInput {
    pub folder_id: String,
    pub title: String,
    pub author: Option<String>,
    pub year: Option<i32>,
    pub pdf_path: Option<String>,
    pub pdf_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePaperInput {
    pub folder_id: Option<String>,
    pub keywords: Option<String>,
    pub author: Option<String>,
    pub year: Option<i32>,
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
    pub pdf_path: Option<String>,
    pub pdf_filename: Option<String>,
    pub user_notes: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_read: Option<bool>,
    pub importance: Option<i32>,
    pub last_analyzed_at: Option<String>,
}
