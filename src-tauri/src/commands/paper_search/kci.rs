use crate::error::AppError;
use crate::models::paper_search::{Author, ExternalIds, SearchQuery, SearchResponse, SearchResult};
use quick_xml::de::from_str as xml_from_str;
use serde::Deserialize;

const API_URL: &str = "https://open.kci.go.kr/po/openapi/openApiSearch.kci";

#[derive(Debug, Deserialize)]
struct Response {
    #[serde(rename = "outputData")]
    output_data: Option<OutputData>,
}

#[derive(Debug, Deserialize)]
struct OutputData {
    #[serde(rename = "totalCount")]
    total_count: Option<String>,
    #[serde(rename = "record")]
    records: Option<Vec<Record>>,
}

#[derive(Debug, Deserialize)]
struct Record {
    #[serde(rename = "articleId")]
    article_id: Option<String>,
    title: Option<String>,
    #[serde(rename = "journalName")]
    journal_name: Option<String>,
    #[serde(rename = "pubYear")]
    pub_year: Option<String>,
    author: Option<String>,
    #[serde(rename = "abstractText")]
    abstract_text: Option<String>,
    doi: Option<String>,
    url: Option<String>,
}

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);
    let page = (offset / limit) + 1;

    let api_key = "demo";

    let mut url = format!(
        "{}?key={}&apiCode=articleSearch&title={}&displayCount={}&page={}",
        API_URL,
        api_key,
        urlencoding::encode(&query.query),
        limit,
        page
    );

    if let Some(year) = &query.year {
        if year.contains('-') {
            let parts: Vec<&str> = year.split('-').collect();
            if parts.len() == 2 {
                url.push_str(&format!("&startPubYear={}&endPubYear={}", parts[0], parts[1]));
            }
        } else {
            url.push_str(&format!("&startPubYear={}&endPubYear={}", year, year));
        }
    }

    let response = client
        .get(&url)
        .header("User-Agent", "PaperManager/1.0")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::Network("KCI search failed".to_string()));
    }

    let xml_text = response
        .text()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let kci_response: Response = xml_from_str(&xml_text)
        .map_err(|e| AppError::Parse(format!("Failed to parse KCI response: {}", e)))?;

    let output = kci_response.output_data.unwrap_or(OutputData {
        total_count: None,
        records: None,
    });

    let total = output.total_count
        .and_then(|c| c.parse::<i32>().ok())
        .unwrap_or(0);

    let records = output.records.unwrap_or_default();

    let results: Vec<SearchResult> = records
        .into_iter()
        .filter_map(|record| {
            let article_id = record.article_id?;
            let title = record.title.unwrap_or_else(|| "Unknown".to_string());

            let authors: Vec<Author> = record.author
                .map(|a| {
                    a.split(';')
                        .map(|name| Author {
                            author_id: None,
                            name: name.trim().to_string(),
                        })
                        .collect()
                })
                .unwrap_or_default();

            let year = record.pub_year.and_then(|y| y.parse::<i32>().ok());

            Some(SearchResult {
                paper_id: format!("KCI:{}", article_id),
                title,
                authors,
                year,
                abstract_text: record.abstract_text,
                venue: record.journal_name,
                citation_count: None,
                url: record.url.or(Some(format!(
                    "https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId={}",
                    article_id
                ))),
                open_access_pdf: None,
                external_ids: record.doi.map(|doi| ExternalIds {
                    doi: Some(doi),
                    arxiv_id: None,
                    pubmed: None,
                    pubmed_central: None,
                }),
            })
        })
        .collect();

    Ok(SearchResponse { total, results })
}
