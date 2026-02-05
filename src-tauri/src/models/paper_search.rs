use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SearchSource {
    SemanticScholar,
    PubMed,
    Crossref,
    Arxiv,
    Kci,
    GoogleScholar,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub paper_id: String,
    pub title: String,
    pub authors: Vec<Author>,
    pub year: Option<i32>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub venue: Option<String>,
    pub citation_count: Option<i32>,
    pub url: Option<String>,
    pub open_access_pdf: Option<OpenAccessPdf>,
    pub external_ids: Option<ExternalIds>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Author {
    pub author_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OpenAccessPdf {
    pub url: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExternalIds {
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub pubmed: Option<String>,
    pub pubmed_central: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub query: String,
    pub source: Option<SearchSource>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub year: Option<String>,
    pub fields_of_study: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub total: i32,
    pub results: Vec<SearchResult>,
}
