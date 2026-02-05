use crate::error::AppError;
use crate::models::paper_search::{Author, ExternalIds, OpenAccessPdf, SearchQuery, SearchResponse, SearchResult};
use serde::Deserialize;

const API_URL: &str = "https://api.crossref.org/works";

#[derive(Debug, Deserialize)]
struct Response {
    message: Message,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct Message {
    total_results: Option<i32>,
    items: Vec<Item>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct Item {
    #[serde(rename = "DOI")]
    doi: String,
    title: Option<Vec<String>>,
    author: Option<Vec<ItemAuthor>>,
    published_print: Option<ItemDate>,
    published_online: Option<ItemDate>,
    container_title: Option<Vec<String>>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    is_referenced_by_count: Option<i32>,
    link: Option<Vec<ItemLink>>,
}

#[derive(Debug, Deserialize)]
struct ItemAuthor {
    given: Option<String>,
    family: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ItemDate {
    date_parts: Option<Vec<Vec<i32>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct ItemLink {
    #[serde(rename = "URL")]
    url: String,
    content_type: Option<String>,
}

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut url = format!(
        "{}?query={}&rows={}&offset={}",
        API_URL,
        urlencoding::encode(&query.query),
        limit,
        offset
    );

    if let Some(year) = &query.year {
        if year.contains('-') {
            let parts: Vec<&str> = year.split('-').collect();
            if parts.len() == 2 {
                url.push_str(&format!("&filter=from-pub-date:{},until-pub-date:{}", parts[0], parts[1]));
            }
        } else {
            url.push_str(&format!("&filter=from-pub-date:{},until-pub-date:{}", year, year));
        }
    }

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0 (mailto:contact@papermanager.app)")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(AppError::Network(format!("Crossref search failed ({})", status)));
    }

    let api_response: Response = response
        .json()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let results: Vec<SearchResult> = api_response
        .message
        .items
        .into_iter()
        .map(|item| {
            let title = item.title
                .and_then(|t| t.into_iter().next())
                .unwrap_or_else(|| "Unknown".to_string());

            let authors: Vec<Author> = item.author
                .unwrap_or_default()
                .into_iter()
                .map(|a| {
                    let name = if let Some(n) = a.name {
                        n
                    } else {
                        let given = a.given.unwrap_or_default();
                        let family = a.family.unwrap_or_default();
                        if given.is_empty() {
                            family
                        } else if family.is_empty() {
                            given
                        } else {
                            format!("{} {}", given, family)
                        }
                    };
                    Author { author_id: None, name }
                })
                .collect();

            let year = item.published_print
                .or(item.published_online)
                .and_then(|d| d.date_parts)
                .and_then(|dp| dp.into_iter().next())
                .and_then(|parts| parts.into_iter().next());

            let venue = item.container_title.and_then(|v| v.into_iter().next());

            let pdf_url = item.link.and_then(|links| {
                links.into_iter()
                    .find(|l| l.content_type.as_ref().map(|c| c.contains("pdf")).unwrap_or(false))
                    .map(|l| l.url)
            });

            SearchResult {
                paper_id: format!("DOI:{}", item.doi),
                title,
                authors,
                year,
                abstract_text: item.abstract_text,
                venue,
                citation_count: item.is_referenced_by_count,
                url: Some(format!("https://doi.org/{}", item.doi)),
                open_access_pdf: pdf_url.map(|url| OpenAccessPdf { url: Some(url), status: None }),
                external_ids: Some(ExternalIds {
                    doi: Some(item.doi),
                    arxiv_id: None,
                    pubmed: None,
                    pubmed_central: None,
                }),
            }
        })
        .collect();

    Ok(SearchResponse {
        total: api_response.message.total_results.unwrap_or(results.len() as i32),
        results,
    })
}
