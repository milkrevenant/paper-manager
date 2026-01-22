import OpenAI from 'openai';
import { AnalysisResult, validateAnalysisResult } from './types';

export class OpenAIVerifier {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  /**
   * Verify and enhance Gemini results using GPT-4o-nano
   */
  async verify(
    geminiResult: AnalysisResult,
    existingTopics: string[] = []
  ): Promise<AnalysisResult & { suggestedTopic?: string }> {
    const prompt = `다음 논문 분석 결과를 검증하고 보완해주세요.

원본 분석 결과 (Gemini):
${JSON.stringify(geminiResult, null, 2)}

작업:
1. 누락된 정보 확인 및 추가
2. 한국어 표현 개선
3. 이 논문이 속할 만한 주제 추천 (기존 주제: ${existingTopics.join(', ') || '없음'})
4. 정확도 검증

응답 형식: JSON
{
  ...원본 구조 유지...,
  "suggestedTopic": "추천 주제명"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini as gpt-4o-nano might not be available yet
        messages: [
          { role: 'system', content: '당신은 학술 논문 분석 검증 전문가입니다.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(text);
      const validated = validateAnalysisResult(parsed);

      return {
        ...validated,
        suggestedTopic: parsed.suggestedTopic,
      };
    } catch (error: any) {
      console.error('OpenAI verification error:', error);
      // If verification fails, return original Gemini result
      console.warn('OpenAI 검증 실패, Gemini 결과만 사용합니다.');
      return geminiResult;
    }
  }

  /**
   * Check if API key is valid
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
