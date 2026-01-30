use crate::error::AppError;
use serde::{Deserialize, Serialize};

// Semantic Scholar API endpoints
const SEMANTIC_SCHOLAR_API: &str = "https://api.semanticscholar.org/graph/v1";

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAccessPdf {
    pub url: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalIds {
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub pubmed: Option<String>,
    pub pubmed_central: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SemanticScholarResponse {
    total: Option<i32>,
    offset: Option<i32>,
    data: Vec<SemanticScholarPaper>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SemanticScholarPaper {
    paper_id: String,
    title: String,
    authors: Option<Vec<SemanticScholarAuthor>>,
    year: Option<i32>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    venue: Option<String>,
    citation_count: Option<i32>,
    url: Option<String>,
    open_access_pdf: Option<OpenAccessPdf>,
    external_ids: Option<ExternalIds>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SemanticScholarAuthor {
    author_id: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub query: String,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub year: Option<String>,  // e.g., "2020-2024" or "2023"
    pub fields_of_study: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub total: i32,
    pub results: Vec<SearchResult>,
}

/// Search papers using Semantic Scholar API
#[tauri::command]
pub async fn search_papers(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();

    // Build query parameters
    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut url = format!(
        "{}/paper/search?query={}&fields={}&limit={}&offset={}",
        SEMANTIC_SCHOLAR_API,
        urlencoding::encode(&query.query),
        fields,
        limit,
        offset
    );

    // Add year filter if specified
    if let Some(year) = &query.year {
        url.push_str(&format!("&year={}", year));
    }

    // Add fields of study filter if specified
    if let Some(fields_of_study) = &query.fields_of_study {
        if !fields_of_study.is_empty() {
            url.push_str(&format!("&fieldsOfStudy={}", fields_of_study.join(",")));
        }
    }

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!(
            "Search failed ({}): {}",
            status, error_text
        )));
    }

    let api_response: SemanticScholarResponse = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // Convert to our response format
    let results: Vec<SearchResult> = api_response
        .data
        .into_iter()
        .map(|paper| SearchResult {
            paper_id: paper.paper_id,
            title: paper.title,
            authors: paper
                .authors
                .unwrap_or_default()
                .into_iter()
                .map(|a| Author {
                    author_id: a.author_id,
                    name: a.name.unwrap_or_default(),
                })
                .collect(),
            year: paper.year,
            abstract_text: paper.abstract_text,
            venue: paper.venue,
            citation_count: paper.citation_count,
            url: paper.url,
            open_access_pdf: paper.open_access_pdf,
            external_ids: paper.external_ids,
        })
        .collect();

    Ok(SearchResponse {
        total: api_response.total.unwrap_or(results.len() as i32),
        results,
    })
}

/// Get paper details by ID
#[tauri::command]
pub async fn get_paper_details(paper_id: String) -> Result<SearchResult, AppError> {
    let client = reqwest::Client::new();

    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let url = format!(
        "{}/paper/{}?fields={}",
        SEMANTIC_SCHOLAR_API, paper_id, fields
    );

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::NotFound(format!(
            "Paper not found ({}): {}",
            status, error_text
        )));
    }

    let paper: SemanticScholarPaper = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    Ok(SearchResult {
        paper_id: paper.paper_id,
        title: paper.title,
        authors: paper
            .authors
            .unwrap_or_default()
            .into_iter()
            .map(|a| Author {
                author_id: a.author_id,
                name: a.name.unwrap_or_default(),
            })
            .collect(),
        year: paper.year,
        abstract_text: paper.abstract_text,
        venue: paper.venue,
        citation_count: paper.citation_count,
        url: paper.url,
        open_access_pdf: paper.open_access_pdf,
        external_ids: paper.external_ids,
    })
}

/// Search papers by DOI
#[tauri::command]
pub async fn search_by_doi(doi: String) -> Result<SearchResult, AppError> {
    get_paper_details(format!("DOI:{}", doi)).await
}

/// Search papers by ArXiv ID
#[tauri::command]
pub async fn search_by_arxiv(arxiv_id: String) -> Result<SearchResult, AppError> {
    get_paper_details(format!("ARXIV:{}", arxiv_id)).await
}

/// Get paper recommendations based on a paper ID
#[tauri::command]
pub async fn get_paper_recommendations(
    paper_id: String,
    limit: Option<i32>,
) -> Result<Vec<SearchResult>, AppError> {
    let client = reqwest::Client::new();

    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let limit = limit.unwrap_or(5).min(20);
    let url = format!(
        "{}/recommendations/v1/papers/forpaper/{}?fields={}&limit={}",
        "https://api.semanticscholar.org", paper_id, fields, limit
    );

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Ok(vec![]);
    }

    #[derive(Deserialize)]
    struct RecommendationResponse {
        #[serde(rename = "recommendedPapers")]
        recommended_papers: Vec<SemanticScholarPaper>,
    }

    let api_response: RecommendationResponse = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let results: Vec<SearchResult> = api_response
        .recommended_papers
        .into_iter()
        .map(|paper| SearchResult {
            paper_id: paper.paper_id,
            title: paper.title,
            authors: paper
                .authors
                .unwrap_or_default()
                .into_iter()
                .map(|a| Author {
                    author_id: a.author_id,
                    name: a.name.unwrap_or_default(),
                })
                .collect(),
            year: paper.year,
            abstract_text: paper.abstract_text,
            venue: paper.venue,
            citation_count: paper.citation_count,
            url: paper.url,
            open_access_pdf: paper.open_access_pdf,
            external_ids: paper.external_ids,
        })
        .collect();

    Ok(results)
}
