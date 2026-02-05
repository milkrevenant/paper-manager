use crate::error::AppError;
use crate::models::paper_search::{Author, ExternalIds, OpenAccessPdf, SearchQuery, SearchResponse, SearchResult};
use serde::Deserialize;
use std::env;

const API_URL: &str = "https://api.semanticscholar.org/graph/v1";

fn get_api_key() -> Option<String> {
    env::var("SEMANTIC_SCHOLAR_API_KEY").ok()
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Response {
    total: Option<i32>,
    offset: Option<i32>,
    data: Vec<Paper>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Paper {
    pub paper_id: String,
    pub title: String,
    pub authors: Option<Vec<PaperAuthor>>,
    pub year: Option<i32>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub venue: Option<String>,
    pub citation_count: Option<i32>,
    pub url: Option<String>,
    pub open_access_pdf: Option<OpenAccessPdf>,
    pub external_ids: Option<ExternalIds>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PaperAuthor {
    pub author_id: Option<String>,
    pub name: Option<String>,
}

pub(crate) fn convert_paper(paper: Paper) -> SearchResult {
    SearchResult {
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
    }
}

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();

    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut url = format!(
        "{}/paper/search?query={}&fields={}&limit={}&offset={}",
        API_URL,
        urlencoding::encode(&query.query),
        fields,
        limit,
        offset
    );

    if let Some(year) = &query.year {
        url.push_str(&format!("&year={}", year));
    }

    if let Some(fields_of_study) = &query.fields_of_study {
        if !fields_of_study.is_empty() {
            url.push_str(&format!("&fieldsOfStudy={}", fields_of_study.join(",")));
        }
    }

    let mut request = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0");

    if let Some(api_key) = get_api_key() {
        request = request.header("x-api-key", api_key);
    }

    let response = request
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!("Search failed ({}): {}", status, error_text)));
    }

    let api_response: Response = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let results: Vec<SearchResult> = api_response.data.into_iter().map(convert_paper).collect();

    Ok(SearchResponse {
        total: api_response.total.unwrap_or(results.len() as i32),
        results,
    })
}

pub async fn get_details(paper_id: String) -> Result<SearchResult, AppError> {
    let client = reqwest::Client::new();

    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let url = format!("{}/paper/{}?fields={}", API_URL, paper_id, fields);

    let mut request = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0");

    if let Some(api_key) = get_api_key() {
        request = request.header("x-api-key", api_key);
    }

    let response = request
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::NotFound(format!("Paper not found ({}): {}", status, error_text)));
    }

    let paper: Paper = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    Ok(convert_paper(paper))
}

pub async fn get_recommendations(paper_id: String, limit: Option<i32>) -> Result<Vec<SearchResult>, AppError> {
    let client = reqwest::Client::new();

    let fields = "paperId,title,authors,year,abstract,venue,citationCount,url,openAccessPdf,externalIds";
    let limit = limit.unwrap_or(5).min(20);
    let url = format!(
        "https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{}?fields={}&limit={}",
        paper_id, fields, limit
    );

    let mut request = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0");

    if let Some(api_key) = get_api_key() {
        request = request.header("x-api-key", api_key);
    }

    let response = request
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Ok(vec![]);
    }

    #[derive(Deserialize)]
    struct RecommendationResponse {
        #[serde(rename = "recommendedPapers")]
        recommended_papers: Vec<Paper>,
    }

    let api_response: RecommendationResponse = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    Ok(api_response.recommended_papers.into_iter().map(convert_paper).collect())
}
