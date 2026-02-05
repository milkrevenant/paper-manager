mod arxiv;
mod crossref;
mod google_scholar;
mod kci;
mod pubmed;
mod semantic_scholar;

use crate::error::AppError;
use crate::models::paper_search::{SearchQuery, SearchResponse, SearchResult, SearchSource};

/// Search papers using the specified source (defaults to Semantic Scholar)
#[tauri::command]
pub async fn search_papers(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let source = query.source.unwrap_or(SearchSource::SemanticScholar);

    match source {
        SearchSource::SemanticScholar => semantic_scholar::search(query).await,
        SearchSource::PubMed => pubmed::search(query).await,
        SearchSource::Crossref => crossref::search(query).await,
        SearchSource::Arxiv => arxiv::search(query).await,
        SearchSource::Kci => kci::search(query).await,
        SearchSource::GoogleScholar => google_scholar::search(query).await,
    }
}

/// Get paper details by ID
#[tauri::command]
pub async fn get_paper_details(paper_id: String) -> Result<SearchResult, AppError> {
    semantic_scholar::get_details(paper_id).await
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
    semantic_scholar::get_recommendations(paper_id, limit).await
}
