use crate::error::AppError;
use crate::models::paper_search::{Author, ExternalIds, OpenAccessPdf, SearchQuery, SearchResponse, SearchResult};
use quick_xml::de::from_str as xml_from_str;
use regex::Regex;
use serde::Deserialize;

const API_URL: &str = "https://export.arxiv.org/api/query";

#[derive(Debug, Deserialize)]
struct Feed {
    #[serde(rename = "totalResults", default)]
    total_results: Option<i32>,
    #[serde(default)]
    entry: Option<Vec<Entry>>,
}

#[derive(Debug, Deserialize)]
struct Entry {
    id: String,
    title: String,
    #[serde(default)]
    author: Vec<EntryAuthor>,
    published: Option<String>,
    summary: Option<String>,
    #[serde(rename = "primary_category")]
    primary_category: Option<Category>,
    #[serde(default)]
    link: Vec<Link>,
}

#[derive(Debug, Deserialize)]
struct EntryAuthor {
    name: String,
}

#[derive(Debug, Deserialize)]
struct Category {
    #[serde(rename = "@term")]
    term: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Link {
    #[serde(rename = "@href")]
    href: String,
    #[serde(rename = "@type")]
    link_type: Option<String>,
    #[serde(rename = "@title")]
    title: Option<String>,
}

/// Strip XML namespace prefixes to work around quick_xml serde limitations
fn strip_namespaces(xml: &str) -> String {
    // Remove namespace declarations
    let re_xmlns = Regex::new(r#"\s+xmlns(:[a-zA-Z0-9_-]+)?="[^"]*""#).unwrap();
    let xml = re_xmlns.replace_all(xml, "");

    // Remove namespace prefixes from tags (e.g., <opensearch:totalResults> -> <totalResults>)
    let re_prefix = Regex::new(r"<(/?)([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)").unwrap();
    re_prefix.replace_all(&xml, "<$1$3").to_string()
}

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let search_query = format!("all:{}", query.query);

    let url = format!(
        "{}?search_query={}&start={}&max_results={}",
        API_URL,
        urlencoding::encode(&search_query),
        offset,
        limit
    );

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::Network("arXiv search failed".to_string()));
    }

    let xml_text = response
        .text()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // Strip namespace prefixes for easier parsing
    let cleaned_xml = strip_namespaces(&xml_text);

    let feed: Feed = xml_from_str(&cleaned_xml)
        .map_err(|e| AppError::Parse(format!("Failed to parse arXiv response: {}", e)))?;

    let entries = feed.entry.unwrap_or_default();

    let results: Vec<SearchResult> = entries
        .into_iter()
        .filter_map(|entry| {
            let arxiv_id = entry.id.split("/abs/").last().map(|s| s.to_string())?;

            let year = entry.published
                .as_ref()
                .and_then(|p| p.get(0..4))
                .and_then(|y| y.parse::<i32>().ok());

            if let Some(year_filter) = &query.year {
                if let Some(paper_year) = year {
                    if year_filter.contains('-') {
                        let parts: Vec<&str> = year_filter.split('-').collect();
                        if parts.len() == 2 {
                            let start: i32 = parts[0].parse().unwrap_or(0);
                            let end: i32 = parts[1].parse().unwrap_or(9999);
                            if paper_year < start || paper_year > end {
                                return None;
                            }
                        }
                    } else if let Ok(filter_year) = year_filter.parse::<i32>() {
                        if paper_year != filter_year {
                            return None;
                        }
                    }
                }
            }

            let authors: Vec<Author> = entry.author
                .into_iter()
                .map(|a| Author { author_id: None, name: a.name })
                .collect();

            let pdf_url = entry.link
                .iter()
                .find(|l| l.title.as_ref().map(|t| t == "pdf").unwrap_or(false))
                .map(|l| l.href.clone());

            let abstract_url = entry.link
                .iter()
                .find(|l| l.link_type.as_ref().map(|t| t.contains("html")).unwrap_or(false))
                .map(|l| l.href.clone());

            let venue = entry.primary_category
                .and_then(|c| c.term)
                .map(|t| format!("arXiv:{}", t));

            Some(SearchResult {
                paper_id: format!("ARXIV:{}", arxiv_id),
                title: entry.title.replace('\n', " ").trim().to_string(),
                authors,
                year,
                abstract_text: entry.summary.map(|s| s.replace('\n', " ").trim().to_string()),
                venue,
                citation_count: None,
                url: abstract_url.or(Some(format!("https://arxiv.org/abs/{}", arxiv_id))),
                open_access_pdf: pdf_url.map(|url| OpenAccessPdf { url: Some(url), status: Some("green".to_string()) }),
                external_ids: Some(ExternalIds {
                    doi: None,
                    arxiv_id: Some(arxiv_id),
                    pubmed: None,
                    pubmed_central: None,
                }),
            })
        })
        .collect();

    Ok(SearchResponse {
        total: feed.total_results.unwrap_or(results.len() as i32),
        results,
    })
}
