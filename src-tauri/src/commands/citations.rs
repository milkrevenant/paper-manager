use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::paper::Paper;

/// Citation style enum for formatting
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CitationStyle {
    Apa,
    Mla,
    Chicago,
    Harvard,
}

/// Citation export result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CitationExport {
    pub format: String,
    pub content: String,
    pub paper_id: String,
}

/// Batch export result for multiple papers
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchCitationExport {
    pub format: String,
    pub content: String,
    pub paper_count: usize,
}

/// Helper function to get paper by ID
fn get_paper_by_id(db: &DbConnection, paper_id: &str) -> Result<Paper, AppError> {
    let conn = db.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, folder_id, paper_number, keywords, author, year, title, publisher, subject,
                purposes, is_qualitative, is_quantitative, qual_tools,
                vars_independent, vars_dependent, vars_moderator, vars_mediator, vars_others,
                quant_techniques, results, limitations, implications, future_plans,
                pdf_path, pdf_filename, user_notes, tags, is_read, importance,
                created_at, updated_at, last_analyzed_at
         FROM papers WHERE id = ?1",
    )?;

    let paper = stmt.query_row([paper_id], |row| {
        Ok(Paper {
            id: row.get(0)?,
            folder_id: row.get(1)?,
            paper_number: row.get(2)?,
            keywords: row.get(3)?,
            author: row.get(4)?,
            year: row.get(5)?,
            title: row.get(6)?,
            publisher: row.get(7)?,
            subject: row.get(8)?,
            purposes: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
            is_qualitative: row.get(10)?,
            is_quantitative: row.get(11)?,
            qual_tools: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or_default(),
            vars_independent: serde_json::from_str(&row.get::<_, String>(13)?).unwrap_or_default(),
            vars_dependent: serde_json::from_str(&row.get::<_, String>(14)?).unwrap_or_default(),
            vars_moderator: serde_json::from_str(&row.get::<_, String>(15)?).unwrap_or_default(),
            vars_mediator: serde_json::from_str(&row.get::<_, String>(16)?).unwrap_or_default(),
            vars_others: serde_json::from_str(&row.get::<_, String>(17)?).unwrap_or_default(),
            quant_techniques: serde_json::from_str(&row.get::<_, String>(18)?).unwrap_or_default(),
            results: serde_json::from_str(&row.get::<_, String>(19)?).unwrap_or_default(),
            limitations: serde_json::from_str(&row.get::<_, String>(20)?).unwrap_or_default(),
            implications: serde_json::from_str(&row.get::<_, String>(21)?).unwrap_or_default(),
            future_plans: serde_json::from_str(&row.get::<_, String>(22)?).unwrap_or_default(),
            pdf_path: row.get(23)?,
            pdf_filename: row.get(24)?,
            user_notes: row.get(25)?,
            tags: serde_json::from_str(&row.get::<_, String>(26)?).unwrap_or_default(),
            is_read: row.get(27)?,
            importance: row.get(28)?,
            created_at: row.get(29)?,
            updated_at: row.get(30)?,
            last_analyzed_at: row.get(31)?,
        })
    })?;

    Ok(paper)
}

/// Generate a citation key for BibTeX (e.g., "smith2023")
fn generate_citation_key(paper: &Paper) -> String {
    let author_part = paper
        .author
        .split(',')
        .next()
        .unwrap_or("unknown")
        .split_whitespace()
        .last()
        .unwrap_or("unknown")
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>();

    let year_part = if paper.year > 0 {
        paper.year.to_string()
    } else {
        "nd".to_string()
    };

    format!("{}{}", author_part, year_part)
}

/// Escape special BibTeX characters
fn escape_bibtex(text: &str) -> String {
    text.replace('&', r"\&")
        .replace('%', r"\%")
        .replace('$', r"\$")
        .replace('#', r"\#")
        .replace('_', r"\_")
        .replace('{', r"\{")
        .replace('}', r"\}")
        .replace('~', r"\textasciitilde{}")
        .replace('^', r"\textasciicircum{}")
}

/// Format a single paper as BibTeX
fn format_bibtex(paper: &Paper) -> String {
    let citation_key = generate_citation_key(paper);
    let mut bibtex = format!("@article{{{},\n", citation_key);

    // Title (required)
    bibtex.push_str(&format!("  title = {{{}}},\n", escape_bibtex(&paper.title)));

    // Author
    if !paper.author.is_empty() {
        bibtex.push_str(&format!("  author = {{{}}},\n", escape_bibtex(&paper.author)));
    }

    // Year
    if paper.year > 0 {
        bibtex.push_str(&format!("  year = {{{}}},\n", paper.year));
    }

    // Publisher/Journal
    if !paper.publisher.is_empty() {
        bibtex.push_str(&format!(
            "  journal = {{{}}},\n",
            escape_bibtex(&paper.publisher)
        ));
    }

    // Keywords
    if !paper.keywords.is_empty() {
        bibtex.push_str(&format!(
            "  keywords = {{{}}},\n",
            escape_bibtex(&paper.keywords)
        ));
    }

    // Subject as abstract or note
    if !paper.subject.is_empty() {
        bibtex.push_str(&format!(
            "  abstract = {{{}}},\n",
            escape_bibtex(&paper.subject)
        ));
    }

    bibtex.push('}');
    bibtex
}

/// Format a single paper as RIS
fn format_ris(paper: &Paper) -> String {
    let mut ris = String::new();

    // Type of reference (Journal Article)
    ris.push_str("TY  - JOUR\n");

    // Title
    ris.push_str(&format!("TI  - {}\n", paper.title));

    // Authors (RIS uses AU for each author)
    if !paper.author.is_empty() {
        for author in paper.author.split(',') {
            let author = author.trim();
            if !author.is_empty() {
                ris.push_str(&format!("AU  - {}\n", author));
            }
        }
    }

    // Year
    if paper.year > 0 {
        ris.push_str(&format!("PY  - {}\n", paper.year));
        ris.push_str(&format!("DA  - {}/01/01\n", paper.year));
    }

    // Publisher/Journal
    if !paper.publisher.is_empty() {
        ris.push_str(&format!("JO  - {}\n", paper.publisher));
        ris.push_str(&format!("PB  - {}\n", paper.publisher));
    }

    // Keywords
    if !paper.keywords.is_empty() {
        for keyword in paper.keywords.split(',') {
            let keyword = keyword.trim();
            if !keyword.is_empty() {
                ris.push_str(&format!("KW  - {}\n", keyword));
            }
        }
    }

    // Subject as abstract
    if !paper.subject.is_empty() {
        ris.push_str(&format!("AB  - {}\n", paper.subject));
    }

    // End of reference
    ris.push_str("ER  - \n");

    ris
}

/// Parse author string into structured format
/// Handles formats like "Smith, John" or "John Smith" or "Smith, J."
fn parse_authors(author_str: &str) -> Vec<(String, String)> {
    let mut authors = Vec::new();

    for author in author_str.split(';').chain(
        if author_str.contains(';') {
            vec![]
        } else {
            author_str.split(" and ").collect()
        }
        .into_iter(),
    ) {
        let author = author.trim();
        if author.is_empty() {
            continue;
        }

        if author.contains(',') {
            // Format: "Last, First"
            let parts: Vec<&str> = author.splitn(2, ',').collect();
            if parts.len() == 2 {
                authors.push((parts[0].trim().to_string(), parts[1].trim().to_string()));
            } else {
                authors.push((author.to_string(), String::new()));
            }
        } else {
            // Format: "First Last"
            let parts: Vec<&str> = author.split_whitespace().collect();
            if parts.len() >= 2 {
                let last = parts.last().unwrap().to_string();
                let first = parts[..parts.len() - 1].join(" ");
                authors.push((last, first));
            } else if parts.len() == 1 {
                authors.push((parts[0].to_string(), String::new()));
            }
        }
    }

    // Deduplicate authors
    authors.dedup();
    authors
}

/// Format citation in APA style (7th edition)
/// Format: Author, A. A., Author, B. B., & Author, C. C. (Year). Title of article. Title of Periodical, volume(issue), pages.
fn format_apa(paper: &Paper) -> String {
    let authors = parse_authors(&paper.author);
    let mut citation = String::new();

    // Format authors
    if authors.is_empty() {
        citation.push_str("Unknown Author");
    } else if authors.len() == 1 {
        let (last, first) = &authors[0];
        if !first.is_empty() {
            // Get initials
            let initials: String = first
                .split_whitespace()
                .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                .collect::<Vec<_>>()
                .join(" ");
            citation.push_str(&format!("{}, {}", last, initials));
        } else {
            citation.push_str(last);
        }
    } else if authors.len() == 2 {
        for (i, (last, first)) in authors.iter().enumerate() {
            if !first.is_empty() {
                let initials: String = first
                    .split_whitespace()
                    .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                    .collect::<Vec<_>>()
                    .join(" ");
                citation.push_str(&format!("{}, {}", last, initials));
            } else {
                citation.push_str(last);
            }
            if i == 0 {
                citation.push_str(", & ");
            }
        }
    } else {
        // 3+ authors: use first author et al. for in-text, but full list for reference
        for (i, (last, first)) in authors.iter().enumerate() {
            if !first.is_empty() {
                let initials: String = first
                    .split_whitespace()
                    .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                    .collect::<Vec<_>>()
                    .join(" ");
                citation.push_str(&format!("{}, {}", last, initials));
            } else {
                citation.push_str(last);
            }
            if i < authors.len() - 2 {
                citation.push_str(", ");
            } else if i == authors.len() - 2 {
                citation.push_str(", & ");
            }
        }
    }

    // Year
    if paper.year > 0 {
        citation.push_str(&format!(" ({}).", paper.year));
    } else {
        citation.push_str(" (n.d.).");
    }

    // Title (in sentence case, italicized for articles)
    citation.push_str(&format!(" {}.", paper.title));

    // Journal/Publisher (italicized)
    if !paper.publisher.is_empty() {
        citation.push_str(&format!(" {}", paper.publisher));
    }

    citation.push('.');
    citation
}

/// Format citation in MLA style (9th edition)
/// Format: Author Last, First. "Title of Article." Title of Journal, vol. #, no. #, Year, pp. #-#.
fn format_mla(paper: &Paper) -> String {
    let authors = parse_authors(&paper.author);
    let mut citation = String::new();

    // Format authors
    if authors.is_empty() {
        citation.push_str("Unknown Author");
    } else if authors.len() == 1 {
        let (last, first) = &authors[0];
        if !first.is_empty() {
            citation.push_str(&format!("{}, {}", last, first));
        } else {
            citation.push_str(last);
        }
    } else if authors.len() == 2 {
        let (last1, first1) = &authors[0];
        let (last2, first2) = &authors[1];
        if !first1.is_empty() {
            citation.push_str(&format!("{}, {}", last1, first1));
        } else {
            citation.push_str(last1);
        }
        citation.push_str(", and ");
        if !first2.is_empty() {
            citation.push_str(&format!("{} {}", first2, last2));
        } else {
            citation.push_str(last2);
        }
    } else {
        // 3+ authors: first author et al.
        let (last, first) = &authors[0];
        if !first.is_empty() {
            citation.push_str(&format!("{}, {}", last, first));
        } else {
            citation.push_str(last);
        }
        citation.push_str(", et al");
    }
    citation.push_str(". ");

    // Title (in quotes)
    citation.push_str(&format!("\"{}\"", paper.title));

    // Journal/Publisher (italicized)
    if !paper.publisher.is_empty() {
        citation.push_str(&format!(". {}", paper.publisher));
    }

    // Year
    if paper.year > 0 {
        citation.push_str(&format!(", {}", paper.year));
    }

    citation.push('.');
    citation
}

/// Format citation in Chicago style (17th edition, Author-Date)
/// Format: Author Last, First. Year. "Title." Journal Name volume (issue): pages.
fn format_chicago(paper: &Paper) -> String {
    let authors = parse_authors(&paper.author);
    let mut citation = String::new();

    // Format authors
    if authors.is_empty() {
        citation.push_str("Unknown Author");
    } else if authors.len() == 1 {
        let (last, first) = &authors[0];
        if !first.is_empty() {
            citation.push_str(&format!("{}, {}", last, first));
        } else {
            citation.push_str(last);
        }
    } else if authors.len() == 2 {
        let (last1, first1) = &authors[0];
        let (last2, first2) = &authors[1];
        if !first1.is_empty() {
            citation.push_str(&format!("{}, {}", last1, first1));
        } else {
            citation.push_str(last1);
        }
        citation.push_str(", and ");
        if !first2.is_empty() {
            citation.push_str(&format!("{} {}", first2, last2));
        } else {
            citation.push_str(last2);
        }
    } else {
        // 3+ authors in Chicago
        for (i, (last, first)) in authors.iter().enumerate() {
            if i == 0 {
                if !first.is_empty() {
                    citation.push_str(&format!("{}, {}", last, first));
                } else {
                    citation.push_str(last);
                }
            } else if i == authors.len() - 1 {
                citation.push_str(", and ");
                if !first.is_empty() {
                    citation.push_str(&format!("{} {}", first, last));
                } else {
                    citation.push_str(last);
                }
            } else {
                citation.push_str(", ");
                if !first.is_empty() {
                    citation.push_str(&format!("{} {}", first, last));
                } else {
                    citation.push_str(last);
                }
            }
        }
    }
    citation.push_str(". ");

    // Year
    if paper.year > 0 {
        citation.push_str(&format!("{}. ", paper.year));
    } else {
        citation.push_str("n.d. ");
    }

    // Title (in quotes)
    citation.push_str(&format!("\"{}\"", paper.title));

    // Journal/Publisher (italicized)
    if !paper.publisher.is_empty() {
        citation.push_str(&format!(". {}", paper.publisher));
    }

    citation.push('.');
    citation
}

/// Format citation in Harvard style
/// Format: Author Last, First Initial. (Year) 'Title', Journal Name, volume(issue), pp. pages.
fn format_harvard(paper: &Paper) -> String {
    let authors = parse_authors(&paper.author);
    let mut citation = String::new();

    // Format authors
    if authors.is_empty() {
        citation.push_str("Unknown Author");
    } else if authors.len() == 1 {
        let (last, first) = &authors[0];
        if !first.is_empty() {
            let initials: String = first
                .split_whitespace()
                .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                .collect::<Vec<_>>()
                .join("");
            citation.push_str(&format!("{}, {}", last, initials));
        } else {
            citation.push_str(last);
        }
    } else if authors.len() == 2 {
        for (i, (last, first)) in authors.iter().enumerate() {
            if !first.is_empty() {
                let initials: String = first
                    .split_whitespace()
                    .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                    .collect::<Vec<_>>()
                    .join("");
                citation.push_str(&format!("{}, {}", last, initials));
            } else {
                citation.push_str(last);
            }
            if i == 0 {
                citation.push_str(" and ");
            }
        }
    } else {
        // 3+ authors: first author et al.
        let (last, first) = &authors[0];
        if !first.is_empty() {
            let initials: String = first
                .split_whitespace()
                .map(|n| format!("{}.", n.chars().next().unwrap_or(' ')))
                .collect::<Vec<_>>()
                .join("");
            citation.push_str(&format!("{}, {}", last, initials));
        } else {
            citation.push_str(last);
        }
        citation.push_str(" et al.");
    }

    // Year
    if paper.year > 0 {
        citation.push_str(&format!(" ({})", paper.year));
    } else {
        citation.push_str(" (n.d.)");
    }

    // Title (in single quotes)
    citation.push_str(&format!(" '{}'", paper.title));

    // Journal/Publisher (italicized)
    if !paper.publisher.is_empty() {
        citation.push_str(&format!(", {}", paper.publisher));
    }

    citation.push('.');
    citation
}

/// Export a single paper as BibTeX
#[tauri::command]
pub async fn export_bibtex(paper_id: String, db: State<'_, DbConnection>) -> Result<CitationExport, AppError> {
    let paper = get_paper_by_id(&db, &paper_id)?;
    let content = format_bibtex(&paper);

    Ok(CitationExport {
        format: "bibtex".to_string(),
        content,
        paper_id,
    })
}

/// Export multiple papers as BibTeX
#[tauri::command]
pub async fn export_bibtex_batch(
    paper_ids: Vec<String>,
    db: State<'_, DbConnection>,
) -> Result<BatchCitationExport, AppError> {
    let mut bibtex_entries = Vec::new();

    for paper_id in &paper_ids {
        let paper = get_paper_by_id(&db, paper_id)?;
        bibtex_entries.push(format_bibtex(&paper));
    }

    Ok(BatchCitationExport {
        format: "bibtex".to_string(),
        content: bibtex_entries.join("\n\n"),
        paper_count: paper_ids.len(),
    })
}

/// Export a single paper as RIS
#[tauri::command]
pub async fn export_ris(paper_id: String, db: State<'_, DbConnection>) -> Result<CitationExport, AppError> {
    let paper = get_paper_by_id(&db, &paper_id)?;
    let content = format_ris(&paper);

    Ok(CitationExport {
        format: "ris".to_string(),
        content,
        paper_id,
    })
}

/// Export multiple papers as RIS
#[tauri::command]
pub async fn export_ris_batch(
    paper_ids: Vec<String>,
    db: State<'_, DbConnection>,
) -> Result<BatchCitationExport, AppError> {
    let mut ris_entries = Vec::new();

    for paper_id in &paper_ids {
        let paper = get_paper_by_id(&db, paper_id)?;
        ris_entries.push(format_ris(&paper));
    }

    Ok(BatchCitationExport {
        format: "ris".to_string(),
        content: ris_entries.join("\n"),
        paper_count: paper_ids.len(),
    })
}

/// Generate a formatted citation in the specified style
#[tauri::command]
pub async fn generate_citation(
    paper_id: String,
    style: CitationStyle,
    db: State<'_, DbConnection>,
) -> Result<CitationExport, AppError> {
    let paper = get_paper_by_id(&db, &paper_id)?;

    let content = match style {
        CitationStyle::Apa => format_apa(&paper),
        CitationStyle::Mla => format_mla(&paper),
        CitationStyle::Chicago => format_chicago(&paper),
        CitationStyle::Harvard => format_harvard(&paper),
    };

    let format_name = match style {
        CitationStyle::Apa => "apa",
        CitationStyle::Mla => "mla",
        CitationStyle::Chicago => "chicago",
        CitationStyle::Harvard => "harvard",
    };

    Ok(CitationExport {
        format: format_name.to_string(),
        content,
        paper_id,
    })
}

/// Generate formatted citations for multiple papers
#[tauri::command]
pub async fn generate_citation_batch(
    paper_ids: Vec<String>,
    style: CitationStyle,
    db: State<'_, DbConnection>,
) -> Result<BatchCitationExport, AppError> {
    let mut citations = Vec::new();

    for paper_id in &paper_ids {
        let paper = get_paper_by_id(&db, paper_id)?;
        let citation = match style {
            CitationStyle::Apa => format_apa(&paper),
            CitationStyle::Mla => format_mla(&paper),
            CitationStyle::Chicago => format_chicago(&paper),
            CitationStyle::Harvard => format_harvard(&paper),
        };
        citations.push(citation);
    }

    let format_name = match style {
        CitationStyle::Apa => "apa",
        CitationStyle::Mla => "mla",
        CitationStyle::Chicago => "chicago",
        CitationStyle::Harvard => "harvard",
    };

    Ok(BatchCitationExport {
        format: format_name.to_string(),
        content: citations.join("\n\n"),
        paper_count: paper_ids.len(),
    })
}

/// Get all available citation styles
#[tauri::command]
pub async fn get_citation_styles() -> Result<Vec<String>, AppError> {
    Ok(vec![
        "apa".to_string(),
        "mla".to_string(),
        "chicago".to_string(),
        "harvard".to_string(),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_paper() -> Paper {
        Paper {
            id: "test-123".to_string(),
            folder_id: "folder-1".to_string(),
            paper_number: 1,
            keywords: "machine learning, AI, neural networks".to_string(),
            author: "Smith, John; Doe, Jane".to_string(),
            year: 2023,
            title: "A Study on Machine Learning Approaches".to_string(),
            publisher: "Journal of AI Research".to_string(),
            subject: "This paper explores various ML approaches.".to_string(),
            purposes: vec![],
            is_qualitative: false,
            is_quantitative: true,
            qual_tools: vec![],
            vars_independent: vec![],
            vars_dependent: vec![],
            vars_moderator: vec![],
            vars_mediator: vec![],
            vars_others: vec![],
            quant_techniques: vec![],
            results: vec![],
            limitations: vec![],
            implications: vec![],
            future_plans: vec![],
            pdf_path: String::new(),
            pdf_filename: String::new(),
            user_notes: String::new(),
            tags: vec![],
            is_read: false,
            importance: 0,
            created_at: String::new(),
            updated_at: String::new(),
            last_analyzed_at: None,
        }
    }

    #[test]
    fn test_bibtex_format() {
        let paper = create_test_paper();
        let bibtex = format_bibtex(&paper);
        assert!(bibtex.contains("@article{smith2023"));
        assert!(bibtex.contains("title = {A Study on Machine Learning Approaches}"));
        assert!(bibtex.contains("author = {Smith, John; Doe, Jane}"));
        assert!(bibtex.contains("year = {2023}"));
    }

    #[test]
    fn test_ris_format() {
        let paper = create_test_paper();
        let ris = format_ris(&paper);
        assert!(ris.contains("TY  - JOUR"));
        assert!(ris.contains("TI  - A Study on Machine Learning Approaches"));
        assert!(ris.contains("AU  - Smith, John"));
        assert!(ris.contains("PY  - 2023"));
        assert!(ris.contains("ER  -"));
    }

    #[test]
    fn test_apa_format() {
        let paper = create_test_paper();
        let apa = format_apa(&paper);
        assert!(apa.contains("Smith, J."));
        assert!(apa.contains("Doe, J."));
        assert!(apa.contains("(2023)"));
    }

    #[test]
    fn test_mla_format() {
        let paper = create_test_paper();
        let mla = format_mla(&paper);
        assert!(mla.contains("Smith, John"));
        assert!(mla.contains("2023"));
    }

    #[test]
    fn test_chicago_format() {
        let paper = create_test_paper();
        let chicago = format_chicago(&paper);
        assert!(chicago.contains("Smith, John"));
        assert!(chicago.contains("2023."));
    }

    #[test]
    fn test_harvard_format() {
        let paper = create_test_paper();
        let harvard = format_harvard(&paper);
        assert!(harvard.contains("Smith, J."));
        assert!(harvard.contains("(2023)"));
    }

    #[test]
    fn test_generate_citation_key() {
        let paper = create_test_paper();
        let key = generate_citation_key(&paper);
        assert_eq!(key, "smith2023");
    }

    #[test]
    fn test_parse_authors() {
        // Test "Last, First" format
        let authors = parse_authors("Smith, John; Doe, Jane");
        assert_eq!(authors.len(), 2);
        assert_eq!(authors[0], ("Smith".to_string(), "John".to_string()));
        assert_eq!(authors[1], ("Doe".to_string(), "Jane".to_string()));

        // Test "First Last" format
        let authors = parse_authors("John Smith");
        assert_eq!(authors.len(), 1);
        assert_eq!(authors[0], ("Smith".to_string(), "John".to_string()));
    }
}
