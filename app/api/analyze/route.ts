import { NextRequest, NextResponse } from 'next/server';
import { GeminiAnalyzer } from '@/lib/ai/gemini-analyzer';
import { OpenAIVerifier } from '@/lib/ai/openai-verifier';
import { updatePaper } from '@/lib/db/papers';
import { validateAnalysisResult } from '@/lib/ai/types';

export const maxDuration = 60; // Set max duration to 60 seconds for long polling

export async function POST(req: NextRequest) {
  try {
    const { paperId, pdfUrl, userId } = await req.json();

    if (!paperId || !pdfUrl || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: paperId, pdfUrl, userId' },
        { status: 400 }
      );
    }

    // 1. Fetch PDF
    console.log(`Fetching PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // 2. Initialize Analyzer
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const analyzer = new GeminiAnalyzer(geminiKey);

    // 3. Run Analysis
    console.log('Starting Gemini analysis...');
    const analysisResult = await analyzer.analyze(base64Pdf);

    // 4. (Optional) Run Verification if OpenAI key is present
    let finalResult = analysisResult;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      console.log('Starting OpenAI verification...');
      try {
        const verifier = new OpenAIVerifier(openaiKey);
        // We pass empty array for existing topics for now, or fetch them if needed
        const verified = await verifier.verify(analysisResult, []);
        // Remove suggestedTopic from result as it's not part of the main paper metadata yet, 
        // or we could handle it if we want to auto-assign topics.
        // For now, validAnalysisResult strips unknown fields, but let's be safe.
        finalResult = validateAnalysisResult(verified);
      } catch (err) {
        console.warn('OpenAI verification failed, using Gemini result:', err);
      }
    }

    // 5. Update Database
    console.log('Updating database...');
    await updatePaper(userId, paperId, {
      ...finalResult,
      lastAnalyzedAt: new Date(),
    });

    return NextResponse.json({ success: true, result: finalResult });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
