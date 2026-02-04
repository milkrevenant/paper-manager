use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Writing Project Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingProjectMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub genre: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub export_format: Option<String>,
}

impl Default for WritingProjectMetadata {
    fn default() -> Self {
        Self {
            genre: None,
            tags: None,
            export_format: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingProject {
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "type")]
    pub project_type: String,  // "standalone" | "paper-linked"
    pub linked_paper_id: Option<String>,
    pub root_document_id: Option<String>,
    pub target_word_count: Option<i32>,
    pub status: String,  // "draft" | "in-progress" | "completed" | "archived"
    pub metadata: WritingProjectMetadata,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWritingProjectInput {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub project_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_paper_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_word_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWritingProjectInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub project_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_paper_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_word_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<WritingProjectMetadata>,
}

// ============================================================================
// Writing Document Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingDocument {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub content: String,  // TipTap JSON content
    pub content_type: String,  // "text" | "folder"
    pub sort_order: i32,
    pub is_expanded: bool,
    pub synopsis: String,
    pub notes: String,
    pub status: String,  // "todo" | "in-progress" | "first-draft" | "revised" | "done"
    pub word_count: i32,
    pub target_word_count: Option<i32>,
    pub labels: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWritingDocumentInput {
    pub project_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWritingDocumentInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_expanded: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub synopsis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub word_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_word_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveWritingDocumentInput {
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

// ============================================================================
// Export Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_size: Option<String>,  // "a4" | "letter"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub margins: Option<ExportMargins>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_family: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_size: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_table_of_contents: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header_template: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer_template: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMargins {
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
    pub left: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DocxExportOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_table_of_contents: Option<bool>,
}
