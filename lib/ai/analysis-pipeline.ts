import { GeminiAnalyzer } from './gemini-analyzer';
import { OpenAIVerifier } from './openai-verifier';
import { AnalysisResult } from './types';
import { createDriveClient } from '../google-drive/client';
import { checkDuplicate, createPaper } from '../db/papers';

export interface AnalysisPipelineOptions {
  userId: string;
  topicId: string;
  fileId: string;
  fileName: string;
  folderId: string;
  geminiApiKey: string;
  openaiApiKey?: string;
  existingTopics?: string[];
  onProgress?: (message: string) => void;
}

export interface AnalysisPipelineResult {
  success: boolean;
  paperId?: string;
  rowNumber?: number;
  analysis?: AnalysisResult;
  suggestedTopic?: string;
  error?: string;
}

/**
 * Main analysis pipeline: Drive -> AI -> Firestore
 */
export class AnalysisPipeline {
  /**
   * Execute full analysis pipeline
   */
  static async execute(
    options: AnalysisPipelineOptions
  ): Promise<AnalysisPipelineResult> {
    const {
      userId,
      topicId,
      fileId,
      fileName,
      folderId,
      geminiApiKey,
      openaiApiKey,
      existingTopics = [],
      onProgress,
    } = options;

    try {
      // Step 1: Check duplicate
      onProgress?.('중복 체크 중...');
      const isDuplicate = await checkDuplicate(userId, fileName);
      if (isDuplicate) {
        return {
          success: false,
          error: '이미 분석된 논문입니다.',
        };
      }

      // Step 2: Download PDF as base64
      onProgress?.('PDF 읽는 중...');
      const driveClient = createDriveClient();
      const base64Pdf = await driveClient.getFileAsBase64(fileId);

      // Step 3: Gemini analysis
      onProgress?.('서지 정보 추출 중...');
      const geminiAnalyzer = new GeminiAnalyzer(geminiApiKey);
      const geminiResult = await geminiAnalyzer.analyze(base64Pdf);

      // Step 4: OpenAI verification (optional)
      let finalResult = geminiResult;
      let suggestedTopic: string | undefined;

      if (openaiApiKey) {
        try {
          onProgress?.('AI 검증 중...');
          const openaiVerifier = new OpenAIVerifier(openaiApiKey);
          const verified = await openaiVerifier.verify(geminiResult, existingTopics);
          finalResult = verified;
          suggestedTopic = verified.suggestedTopic;
        } catch (error) {
          console.warn('OpenAI verification skipped:', error);
        }
      }

      // Step 5: Save to Firestore
      onProgress?.('데이터 저장 중...');
      const paperId = await createPaper(userId, {
        topicId,
        keywords: finalResult.keywords,
        author: finalResult.author,
        year: parseInt(finalResult.year) || new Date().getFullYear(),
        title: finalResult.title || fileName,
        publisher: finalResult.publisher,
        subject: finalResult.subject,
        
        purposes: finalResult.purposes,
        isQualitative: finalResult.isQualitative,
        isQuantitative: finalResult.isQuantitative,
        
        qualTools: finalResult.qualTools,
        
        varsIndependent: finalResult.vars_independent,
        varsDependent: finalResult.vars_dependent,
        varsModerator: finalResult.vars_moderator,
        varsMediator: finalResult.vars_mediator,
        varsOthers: finalResult.vars_others,
        quantTechniques: finalResult.quantTechniques,
        
        results: finalResult.results,
        limitations: finalResult.limitations,
        implications: finalResult.implications,
        futurePlans: finalResult.futurePlans,
        
        googleDriveFileId: fileId,
        googleDriveFolderId: folderId,
        pdfUrl: '', // Will be set later if needed
        
        userNotes: '',
        tags: [],
        isRead: false,
        importance: 3,
      });

      onProgress?.('완료!');

      return {
        success: true,
        paperId,
        analysis: finalResult,
        suggestedTopic,
      };
    } catch (error: any) {
      console.error('Analysis pipeline error:', error);
      return {
        success: false,
        error: error.message || '분석 중 오류가 발생했습니다.',
      };
    }
  }
}
