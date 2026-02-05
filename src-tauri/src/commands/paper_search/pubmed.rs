use crate::error::AppError;
use crate::models::paper_search::{Author, ExternalIds, SearchQuery, SearchResponse, SearchResult};
use serde::Deserialize;

const API_URL: &str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

#[derive(Debug, Deserialize)]
struct SearchResultResponse {
    esearchresult: ESearchResult,
}

#[derive(Debug, Deserialize)]
struct ESearchResult {
    count: Option<String>,
    idlist: Option<Vec<String>>,
}

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut search_term = query.query.clone();

    if let Some(year) = &query.year {
        if year.contains('-') {
            let parts: Vec<&str> = year.split('-').collect();
            if parts.len() == 2 {
                search_term.push_str(&format!(" AND {}:{}[dp]", parts[0], parts[1]));
            }
        } else {
            search_term.push_str(&format!(" AND {}[dp]", year));
        }
    }

    let search_url = format!(
        "{}/esearch.fcgi?db=pubmed&term={}&retmax={}&retstart={}&retmode=json",
        API_URL,
        urlencoding::encode(&search_term),
        limit,
        offset
    );

    let search_response = client
        .get(&search_url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !search_response.status().is_success() {
        return Err(AppError::Network("PubMed search failed".to_string()));
    }

    let search_result: SearchResultResponse = search_response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let pmids = search_result.esearchresult.idlist.unwrap_or_default();
    let total = search_result.esearchresult.count
        .and_then(|c| c.parse::<i32>().ok())
        .unwrap_or(0);

    if pmids.is_empty() {
        return Ok(SearchResponse { total: 0, results: vec![] });
    }

    let summary_url = format!(
        "{}/esummary.fcgi?db=pubmed&id={}&retmode=json",
        API_URL,
        pmids.join(",")
    );

    let summary_response = client
        .get(&summary_url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !summary_response.status().is_success() {
        return Err(AppError::Network("PubMed summary fetch failed".to_string()));
    }

    let summary_text = summary_response
        .text()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let summary_json: serde_json::Value = serde_json::from_str(&summary_text)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let mut results = Vec::new();

    if let Some(result_obj) = summary_json.get("result") {
        for pmid in &pmids {
            if let Some(article) = result_obj.get(pmid) {
                let title = article.get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let authors: Vec<Author> = article.get("authors")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|a| {
                                a.get("name").and_then(|n| n.as_str()).map(|name| Author {
                                    author_id: None,
                                    name: name.to_string(),
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                let year = article.get("pubdate")
                    .and_then(|v| v.as_str())
                    .and_then(|d| d.split_whitespace().next())
                    .and_then(|y| y.parse::<i32>().ok());

                let venue = article.get("fulljournalname")
                    .or_else(|| article.get("source"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let doi = article.get("elocationid")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.strip_prefix("doi: "))
                    .map(|s| s.to_string());

                results.push(SearchResult {
                    paper_id: format!("PMID:{}", pmid),
                    title,
                    authors,
                    year,
                    abstract_text: None,
                    venue,
                    citation_count: None,
                    url: Some(format!("https://pubmed.ncbi.nlm.nih.gov/{}/", pmid)),
                    open_access_pdf: None,
                    external_ids: Some(ExternalIds {
                        doi,
                        arxiv_id: None,
                        pubmed: Some(pmid.clone()),
                        pubmed_central: None,
                    }),
                });
            }
        }
    }

    Ok(SearchResponse { total, results })
}
