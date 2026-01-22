/**
 * Analysis result type matching AppScript schema
 */
export interface AnalysisResult {
 // 기본 서지 정보
  keywords: string;
  author: string;
  year: string;
  title: string;
  publisher: string;
  subject: string;
  
  // 연구 설계
  purposes: string[];
  isQualitative: boolean;
  isQuantitative: boolean;
  
  // 질적 연구
  qualTools: string[];
  
  // 양적 연구
  vars_independent: string[];
  vars_dependent: string[];
  vars_moderator: string[];
  vars_mediator: string[];
  vars_others: string[];
  quantTechniques: string[];
  
  // 연구 결과
  results: string[];
  limitations: string[];
  implications: string[];
  futurePlans: string[];
}

// Validation: ensure arrays don't exceed 10 items
export function validateAnalysisResult(data: any): AnalysisResult {
  const trimArray = (arr: any[], max = 10): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, max).map(String);
  };

  return {
    keywords: String(data.keywords || ''),
    author: String(data.author || ''),
    year: String(data.year || ''),
    title: String(data.title || ''),
    publisher: String(data.publisher || ''),
    subject: String(data.subject || ''),
    
    purposes: trimArray(data.purposes),
    isQualitative: Boolean(data.isQualitative),
    isQuantitative: Boolean(data.isQuantitative),
    
    qualTools: trimArray(data.qualTools),
    
    vars_independent: trimArray(data.vars_independent),
    vars_dependent: trimArray(data.vars_dependent),
    vars_moderator: trimArray(data.vars_moderator),
    vars_mediator: trimArray(data.vars_mediator),
    vars_others: trimArray(data.vars_others),
    quantTechniques: trimArray(data.quantTechniques),
    
    results: trimArray(data.results),
    limitations: trimArray(data.limitations),
    implications: trimArray(data.implications),
    futurePlans: trimArray(data.futurePlans),
  };
}
