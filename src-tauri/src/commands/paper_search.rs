use crate::error::AppError;
use serde::{Deserialize, Serialize};
use quick_xml::de::from_str as xml_from_str;

// API endpoints
const SEMANTIC_SCHOLAR_API: &str = "https://api.semanticscholar.org/graph/v1";
const PUBMED_API: &str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const CROSSREF_API: &str = "https://api.crossref.org/works";
const ARXIV_API: &str = "https://export.arxiv.org/api/query";
const KCI_API: &str = "https://open.kci.go.kr/po/openapi/openApiSearch.kci";

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
    pub source: Option<SearchSource>,
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

/// Search papers using the specified source (defaults to Semantic Scholar)
#[tauri::command]
pub async fn search_papers(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let source = query.source.unwrap_or(SearchSource::SemanticScholar);

    match source {
        SearchSource::SemanticScholar => search_semantic_scholar(query).await,
        SearchSource::PubMed => search_pubmed(query).await,
        SearchSource::Crossref => search_crossref(query).await,
        SearchSource::Arxiv => search_arxiv(query).await,
        SearchSource::Kci => search_kci(query).await,
        SearchSource::GoogleScholar => search_google_scholar(query).await,
    }
}

/// Search papers using Semantic Scholar API
async fn search_semantic_scholar(query: SearchQuery) -> Result<SearchResponse, AppError> {
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

// ============================================================================
// PubMed Search Implementation
// ============================================================================

#[derive(Debug, Deserialize)]
struct PubMedSearchResult {
    esearchresult: PubMedESearchResult,
}

#[derive(Debug, Deserialize)]
struct PubMedESearchResult {
    count: Option<String>,
    idlist: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
#[allow(dead_code)]
struct PubMedSummaryResult {
    result: Option<PubMedResultContainer>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct PubMedResultContainer {
    #[serde(flatten)]
    articles: std::collections::HashMap<String, serde_json::Value>,
}

/// Search papers using PubMed API (NCBI E-utilities)
async fn search_pubmed(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    // Step 1: Search for PMIDs
    let mut search_term = query.query.clone();

    // Add year filter if specified
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
        PUBMED_API,
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

    let search_result: PubMedSearchResult = search_response
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

    // Step 2: Fetch article details
    let summary_url = format!(
        "{}/esummary.fcgi?db=pubmed&id={}&retmode=json",
        PUBMED_API,
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
                    abstract_text: None, // ESummary doesn't include abstracts
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

// ============================================================================
// Crossref Search Implementation
// ============================================================================

#[derive(Debug, Deserialize)]
struct CrossrefResponse {
    message: CrossrefMessage,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct CrossrefMessage {
    total_results: Option<i32>,
    items: Vec<CrossrefItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct CrossrefItem {
    #[serde(rename = "DOI")]
    doi: String,
    title: Option<Vec<String>>,
    author: Option<Vec<CrossrefAuthor>>,
    published_print: Option<CrossrefDate>,
    published_online: Option<CrossrefDate>,
    container_title: Option<Vec<String>>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    is_referenced_by_count: Option<i32>,
    link: Option<Vec<CrossrefLink>>,
}

#[derive(Debug, Deserialize)]
struct CrossrefAuthor {
    given: Option<String>,
    family: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CrossrefDate {
    date_parts: Option<Vec<Vec<i32>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct CrossrefLink {
    #[serde(rename = "URL")]
    url: String,
    content_type: Option<String>,
}

/// Search papers using Crossref API
async fn search_crossref(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut url = format!(
        "{}?query={}&rows={}&offset={}",
        CROSSREF_API,
        urlencoding::encode(&query.query),
        limit,
        offset
    );

    // Add year filter if specified
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

    let api_response: CrossrefResponse = response
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

            let venue = item.container_title
                .and_then(|v| v.into_iter().next());

            let pdf_url = item.link
                .and_then(|links| {
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

// ============================================================================
// arXiv Search Implementation
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
struct ArxivFeed {
    #[serde(rename = "totalResults", default)]
    total_results: Option<i32>,
    entry: Option<Vec<ArxivEntry>>,
}

#[derive(Debug, Deserialize)]
struct ArxivEntry {
    id: String,
    title: String,
    author: Option<ArxivAuthors>,
    published: Option<String>,
    summary: Option<String>,
    #[serde(rename = "arxiv:primary_category")]
    primary_category: Option<ArxivCategory>,
    link: Option<Vec<ArxivLink>>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(untagged)]
enum ArxivAuthors {
    Single(ArxivAuthor),
    Multiple(Vec<ArxivAuthor>),
    #[default]
    None,
}

#[derive(Debug, Deserialize)]
struct ArxivAuthor {
    name: String,
}

#[derive(Debug, Deserialize)]
struct ArxivCategory {
    #[serde(rename = "@term")]
    term: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ArxivLink {
    #[serde(rename = "@href")]
    href: String,
    #[serde(rename = "@type")]
    link_type: Option<String>,
    #[serde(rename = "@title")]
    title: Option<String>,
}

/// Search papers using arXiv API
async fn search_arxiv(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);

    // Build search query
    let search_query = format!("all:{}", query.query);

    // arXiv doesn't support exact year filtering in the same way,
    // but we can filter in post-processing

    let url = format!(
        "{}?search_query={}&start={}&max_results={}",
        ARXIV_API,
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

    // Parse XML response
    let feed: ArxivFeed = xml_from_str(&xml_text)
        .map_err(|e| AppError::Parse(format!("Failed to parse arXiv response: {}", e)))?;

    let entries = feed.entry.unwrap_or_default();

    let results: Vec<SearchResult> = entries
        .into_iter()
        .filter_map(|entry| {
            // Extract arXiv ID from URL
            let arxiv_id = entry.id
                .split("/abs/")
                .last()
                .map(|s| s.to_string())?;

            // Parse year from published date
            let year = entry.published
                .as_ref()
                .and_then(|p| p.get(0..4))
                .and_then(|y| y.parse::<i32>().ok());

            // Apply year filter if specified
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

            let authors: Vec<Author> = match entry.author {
                Some(ArxivAuthors::Single(a)) => vec![Author { author_id: None, name: a.name }],
                Some(ArxivAuthors::Multiple(authors)) => {
                    authors.into_iter().map(|a| Author { author_id: None, name: a.name }).collect()
                },
                Some(ArxivAuthors::None) | None => vec![],
            };

            let pdf_url = entry.link
                .as_ref()
                .and_then(|links| {
                    links.iter()
                        .find(|l| l.title.as_ref().map(|t| t == "pdf").unwrap_or(false))
                        .map(|l| l.href.clone())
                });

            let abstract_url = entry.link
                .as_ref()
                .and_then(|links| {
                    links.iter()
                        .find(|l| l.link_type.as_ref().map(|t| t.contains("html")).unwrap_or(false))
                        .map(|l| l.href.clone())
                });

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

// ============================================================================
// KCI (Korea Citation Index) Search Implementation
// ============================================================================

#[derive(Debug, Deserialize)]
struct KciResponse {
    #[serde(rename = "outputData")]
    output_data: Option<KciOutputData>,
}

#[derive(Debug, Deserialize)]
struct KciOutputData {
    #[serde(rename = "totalCount")]
    total_count: Option<String>,
    #[serde(rename = "record")]
    records: Option<Vec<KciRecord>>,
}

#[derive(Debug, Deserialize)]
struct KciRecord {
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

/// Search papers using KCI (Korea Citation Index) API
async fn search_kci(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::new();
    let limit = query.limit.unwrap_or(10).min(100);
    let offset = query.offset.unwrap_or(0);
    let page = (offset / limit) + 1;

    // KCI requires an API key, but has a demo key for testing
    let api_key = "demo";  // Replace with actual API key in production

    let mut url = format!(
        "{}?key={}&apiCode=articleSearch&title={}&displayCount={}&page={}",
        KCI_API,
        api_key,
        urlencoding::encode(&query.query),
        limit,
        page
    );

    // Add year filter if specified
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

    // Parse XML response
    let kci_response: KciResponse = xml_from_str(&xml_text)
        .map_err(|e| AppError::Parse(format!("Failed to parse KCI response: {}", e)))?;

    let output = kci_response.output_data.unwrap_or(KciOutputData {
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
                url: record.url.or(Some(format!("https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId={}", article_id))),
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

// ============================================================================
// Google Scholar Search Implementation (Web Scraping)
// ============================================================================

/// Search papers using Google Scholar (web scraping)
async fn search_google_scholar(query: SearchQuery) -> Result<SearchResponse, AppError> {
    use scraper::{Html, Selector};

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let limit = query.limit.unwrap_or(10).min(20); // Google Scholar shows max 10 per page
    let offset = query.offset.unwrap_or(0);

    // Build Google Scholar URL
    let mut url = format!(
        "https://scholar.google.com/scholar?q={}&start={}&num={}",
        urlencoding::encode(&query.query),
        offset,
        limit
    );

    // Add year filter if specified
    if let Some(year) = &query.year {
        if year.contains('-') {
            let parts: Vec<&str> = year.split('-').collect();
            if parts.len() == 2 {
                url.push_str(&format!("&as_ylo={}&as_yhi={}", parts[0], parts[1]));
            }
        } else {
            url.push_str(&format!("&as_ylo={}&as_yhi={}", year, year));
        }
    }

    let response = client
        .get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.5")
        .header("Connection", "keep-alive")
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "Google Scholar search failed ({})",
            response.status()
        )));
    }

    let html_text = response
        .text()
        .await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // Check for CAPTCHA
    if html_text.contains("CAPTCHA") || html_text.contains("unusual traffic") {
        return Err(AppError::Network(
            "Google Scholar requires CAPTCHA verification. Try again later.".to_string()
        ));
    }

    // Parse HTML
    let document = Html::parse_document(&html_text);

    // Selectors for Google Scholar result items
    let result_selector = Selector::parse(".gs_r.gs_or.gs_scl").unwrap();
    let title_selector = Selector::parse(".gs_rt a").unwrap();
    let title_text_selector = Selector::parse(".gs_rt").unwrap();
    let author_selector = Selector::parse(".gs_a").unwrap();
    let snippet_selector = Selector::parse(".gs_rs").unwrap();
    let cite_selector = Selector::parse(".gs_fl a").unwrap();
    let pdf_selector = Selector::parse(".gs_or_ggsm a").unwrap();

    let mut results = Vec::new();

    for (idx, element) in document.select(&result_selector).enumerate() {
        // Extract title and URL
        let (title, url) = if let Some(title_elem) = element.select(&title_selector).next() {
            let title = title_elem.text().collect::<String>();
            let url = title_elem.value().attr("href").map(|s| s.to_string());
            (title, url)
        } else if let Some(title_elem) = element.select(&title_text_selector).next() {
            (title_elem.text().collect::<String>(), None)
        } else {
            continue;
        };

        // Skip if title is empty
        if title.trim().is_empty() {
            continue;
        }

        // Extract author/year/venue info
        let author_info = element
            .select(&author_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();

        // Parse author info (format: "Author1, Author2 - Journal, Year - Publisher")
        let parts: Vec<&str> = author_info.split(" - ").collect();

        let authors: Vec<Author> = parts
            .first()
            .map(|s| {
                s.split(',')
                    .take(3) // Take first 3 authors
                    .map(|name| Author {
                        author_id: None,
                        name: name.trim().to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Try to extract year from author info
        let year: Option<i32> = author_info
            .chars()
            .collect::<Vec<_>>()
            .windows(4)
            .find_map(|window| {
                let s: String = window.iter().collect();
                if s.chars().all(|c| c.is_ascii_digit()) {
                    let y: i32 = s.parse().ok()?;
                    if (1900..=2030).contains(&y) {
                        return Some(y);
                    }
                }
                None
            });

        // Extract venue
        let venue = parts.get(1).map(|s| s.trim().to_string());

        // Extract abstract/snippet
        let abstract_text = element
            .select(&snippet_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        // Extract citation count
        let citation_count = element
            .select(&cite_selector)
            .filter_map(|e| {
                let text = e.text().collect::<String>();
                if text.starts_with("Cited by") {
                    text.replace("Cited by", "")
                        .trim()
                        .parse::<i32>()
                        .ok()
                }
                else {
                    None
                }
            })
            .next();

        // Extract PDF link
        let pdf_url = element
            .select(&pdf_selector)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|s| s.to_string());

        results.push(SearchResult {
            paper_id: format!("GS:{}", idx + offset as usize),
            title: title.trim().to_string(),
            authors,
            year,
            abstract_text,
            venue,
            citation_count,
            url,
            open_access_pdf: pdf_url.map(|u| OpenAccessPdf {
                url: Some(u),
                status: Some("green".to_string()),
            }),
            external_ids: None,
        });
    }

    // Google Scholar doesn't provide total count easily, estimate based on results
    let total = if results.is_empty() { 0 } else { 1000 }; // Estimate

    Ok(SearchResponse { total, results })
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
