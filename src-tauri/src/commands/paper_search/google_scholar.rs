use crate::error::AppError;
use crate::models::paper_search::{Author, OpenAccessPdf, SearchQuery, SearchResponse, SearchResult};
use scraper::{Html, Selector};

pub async fn search(query: SearchQuery) -> Result<SearchResponse, AppError> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let limit = query.limit.unwrap_or(10).min(20);
    let offset = query.offset.unwrap_or(0);

    let mut url = format!(
        "https://scholar.google.com/scholar?q={}&start={}&num={}",
        urlencoding::encode(&query.query),
        offset,
        limit
    );

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

    if html_text.contains("CAPTCHA") || html_text.contains("unusual traffic") {
        return Err(AppError::Network(
            "Google Scholar requires CAPTCHA verification. Try again later.".to_string()
        ));
    }

    let document = Html::parse_document(&html_text);

    let result_selector = Selector::parse(".gs_r.gs_or.gs_scl").unwrap();
    let title_selector = Selector::parse(".gs_rt a").unwrap();
    let title_text_selector = Selector::parse(".gs_rt").unwrap();
    let author_selector = Selector::parse(".gs_a").unwrap();
    let snippet_selector = Selector::parse(".gs_rs").unwrap();
    let cite_selector = Selector::parse(".gs_fl a").unwrap();
    let pdf_selector = Selector::parse(".gs_or_ggsm a").unwrap();

    let mut results = Vec::new();

    for (idx, element) in document.select(&result_selector).enumerate() {
        let (title, url) = if let Some(title_elem) = element.select(&title_selector).next() {
            let title = title_elem.text().collect::<String>();
            let url = title_elem.value().attr("href").map(|s| s.to_string());
            (title, url)
        } else if let Some(title_elem) = element.select(&title_text_selector).next() {
            (title_elem.text().collect::<String>(), None)
        } else {
            continue;
        };

        if title.trim().is_empty() {
            continue;
        }

        let author_info = element
            .select(&author_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();

        let parts: Vec<&str> = author_info.split(" - ").collect();

        let authors: Vec<Author> = parts
            .first()
            .map(|s| {
                s.split(',')
                    .take(3)
                    .map(|name| Author {
                        author_id: None,
                        name: name.trim().to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default();

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

        let venue = parts.get(1).map(|s| s.trim().to_string());

        let abstract_text = element
            .select(&snippet_selector)
            .next()
            .map(|e| e.text().collect::<String>());

        let citation_count = element
            .select(&cite_selector)
            .filter_map(|e| {
                let text = e.text().collect::<String>();
                if text.starts_with("Cited by") {
                    text.replace("Cited by", "").trim().parse::<i32>().ok()
                } else {
                    None
                }
            })
            .next();

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

    let total = if results.is_empty() { 0 } else { 1000 };

    Ok(SearchResponse { total, results })
}
