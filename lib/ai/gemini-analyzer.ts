import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult, validateAnalysisResult } from './types';

const GEMINI_PROMPT = `당신은 학술 논문 분석 전문가입니다. 논문을 읽고 다음 JSON 형식으로 응답하세요.

[지침]
- 발행처에 학위구분(석사/박사) 포함
- 연구대상 요약
- 한국어로 작성
- 각 배열 필드는 최대 10개까지

JSON 구조:
{
  "keywords": "",
  "author": "",
  "year": "",
  "title": "",
  "publisher": "",
  "subject": "",
  "purposes": [],
  "isQualitative": true/false,
  "isQuantitative": true/false,
  "qualTools": [],
  "vars_independent": [],
  "vars_dependent": [],
  "vars_moderator": [],
  "vars_mediator": [],
  "vars_others": [],
  "quantTechniques": [],
  "results": [],
  "limitations": [],
  "implications": [],
  "futurePlans": []
}`;

export class GeminiAnalyzer {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    // Use Gemini 2.0 Flash
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
  }

  /**
   * Analyze PDF using Gemini API
   */
  async analyze(base64Pdf: string): Promise<AnalysisResult> {
    try {
      const result = await this.model.generateContent([
        { text: GEMINI_PROMPT },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const parsed = JSON.parse(text);
      
      // Validate and sanitize
      return validateAnalysisResult(parsed);
    } catch (error: any) {
      console.error('Gemini analysis error:', error);
      throw new Error(`Gemini 분석 실패: ${error.message}`);
    }
  }

  /**
   * Check if API key is valid
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      await model.generateContent('Test');
      return true;
    } catch {
      return false;
    }
  }
}
