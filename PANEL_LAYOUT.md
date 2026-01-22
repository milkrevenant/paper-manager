# Panel Layout Reference

## 4-Panel Dashboard Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Dashboard                                       │
├───────────┬─────────────┬────────────────────────┬─────────────────────────┤
│           │             │                        │                         │
│  Panel 1  │   Panel 2   │       Panel 3          │        Panel 4          │
│           │             │                        │                         │
│  Topics   │  PaperList  │      PDFViewer         │     MetadataPanel       │
│   Tree    │             │                        │                         │
│           │             │                        │                         │
│  (18%)    │   (22%)     │        (35%)           │         (25%)           │
│  min: 5%  │  min: 10%   │       min: 0%          │        min: 5%          │
│           │             │     collapsible        │                         │
│           │             │                        │                         │
├───────────┼─────────────┼────────────────────────┼─────────────────────────┤
│ 라이브러리 │  논문 목록   │      PDF 뷰어           │       메타데이터          │
└───────────┴─────────────┴────────────────────────┴─────────────────────────┘
```

## Panel Details

| Panel # | Component Name | Korean Name | File Path | Default Size | Min Size |
|---------|---------------|-------------|-----------|--------------|----------|
| 1 | TopicsTree | 라이브러리 | `components/sidebars/TopicsTree.tsx` | 18% | 5% |
| 2 | PaperList | 논문 목록 | `components/sidebars/PaperList.tsx` | 22% | 10% |
| 3 | PDFViewer | PDF 뷰어 | `components/main/PDFViewer.tsx` | 35% | 0% (collapsible) |
| 4 | MetadataPanel | 메타데이터 | `components/sidebars/MetadataPanel.tsx` | 25% | 5% |

## Panel Contents

### Panel 1: TopicsTree (라이브러리)
- 헤더: "라이브러리" + 추가 버튼
- 트리 구조: 주제 > 폴더
- "모든 논문" 항목
- PDF 업로드 드래그 영역
- 사용자 프로필 섹션

### Panel 2: PaperList (논문 목록)
- 헤더: "논문 목록" + 검색창
- 테이블: No., Title, Author, Year, Rate
- 드래그 앤 드롭 지원

### Panel 3: PDFViewer (PDF 뷰어)
- PDF 문서 표시 (현재 placeholder)
- 완전히 접을 수 있음 (collapsible)

### Panel 4: MetadataPanel (메타데이터)
- 헤더: 논문번호, AI 분석 상태, AI 분석 버튼
- Basic Info: Title, Author, Publisher, Year, Subject, Keywords
- Research Design: Objectives, Qualitative/Quantitative 토글
- Variables: IV, DV, Moderator, Mediator (양적연구 시)
- Key Results: Results, Limitations, Implications
- Research Notes: 메모 영역

## Quick Reference Commands

```
Panel 1 = TopicsTree = 라이브러리 = 맨 왼쪽
Panel 2 = PaperList = 논문 목록 = 왼쪽에서 두번째
Panel 3 = PDFViewer = PDF 뷰어 = 가운데
Panel 4 = MetadataPanel = 메타데이터 = 맨 오른쪽
```
