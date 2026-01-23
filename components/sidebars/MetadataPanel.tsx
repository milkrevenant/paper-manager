'use client';

import { useState, useEffect } from 'react';
import type { Paper } from '@/lib/tauri/types';
import { FileText, Sparkles, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { DynamicList } from '@/components/ui/dynamic-list';

interface MetadataPanelProps {
  paper: Paper | null;
  aiEnabled: boolean;
  onUpdate?: (data: Partial<Paper>) => void;
}

export function MetadataPanel({ paper, aiEnabled, onUpdate }: MetadataPanelProps) {
  const [formData, setFormData] = useState<Partial<Paper>>(paper || {});
  const [isDirty, setIsDirty] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Update formData when paper changes
  useEffect(() => {
    setFormData(paper || {});
    setIsDirty(false);
  }, [paper]);

  // Auto-save effect
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      if (onUpdate) {
        onUpdate(formData);
        setIsDirty(false); // Reset dirty state after save
        // Optional: Show saving indicator
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [formData, isDirty, onUpdate]);

  if (!paper) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50/50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-stone-500 font-medium">논문을 선택하여 상세 정보를 확인하세요</p>
        </div>
      </div>
    );
  }

  const handleChange = (field: keyof Paper, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAnalyze = async () => {
    if (!paper?.pdfPath) {
      alert('분석할 PDF 파일이 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Mock user ID for now as we don't have auth context yet
      const userId = 'demo-user';

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: paper.id,
          pdfPath: paper.pdfPath,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Update local state with analysis results
      setFormData(prev => ({
        ...prev,
        ...data.result,
        lastAnalyzedAt: new Date(),
      }));
      setIsDirty(true);
      alert('AI 분석이 완료되었습니다.');
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(`분석 실패: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white min-h-0">
      {/* Header / Actions */}
      <div className="flex items-center justify-between py-2 px-3 shrink-0 border-b border-stone-200 min-h-[60px]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-display bg-white py-0.5">
            #{paper.paperNumber}
          </Badge>
          <Badge variant={formData.lastAnalyzedAt ? "secondary" : "outline"} className="gap-1 py-0.5">
            {isDirty ? (
               <span className="text-stone-400">Saving...</span>
            ) : (
                formData.lastAnalyzedAt ? (
                <>
                    <Sparkles className="w-3 h-3 text-[#d97757]" />
                    <span className="text-[#d97757]">AI Analyzed</span>
                </>
                ) : (
                <span className="text-stone-500">Not Analyzed</span>
                )
            )}
          </Badge>
        </div>
        
        {/* AI Analysis Trigger (Moved to Header) */}
        {aiEnabled && (
            <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs border-[#d97757]/30 text-[#d97757] hover:bg-[#d97757]/5 hover:text-[#d97757]"
            >
                <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? '분석 중...' : (formData.lastAnalyzedAt ? '재분석' : 'AI 분석')}
            </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="px-3 pb-3 pt-2 space-y-6">
          {/* Basic Info Section */}
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Title</label>
              <Textarea 
                value={formData.title || ''} 
                onChange={(e) => handleChange('title', e.target.value)}
                className="font-bold text-lg leading-snug min-h-[80px] resize-none bg-white/50 focus:bg-white transition-colors"
                placeholder="논문 제목"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Author</label>
                <Input 
                  value={formData.author || ''} 
                  onChange={(e) => handleChange('author', e.target.value)}
                  className="bg-white/50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Publisher</label>
                <Input 
                  value={formData.publisher || ''} 
                  onChange={(e) => handleChange('publisher', e.target.value)}
                  className="bg-white/50 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Year</label>
                <Input 
                  type="number"
                  value={formData.year || ''} 
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  className="font-display bg-white/50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Subject</label>
                <Input 
                  value={formData.subject || ''} 
                  onChange={(e) => handleChange('subject', e.target.value)}
                  className="bg-white/50 focus:bg-white"
                />
              </div>
            </div>

             <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Keywords</label>
              <Input 
                value={formData.keywords || ''} 
                onChange={(e) => handleChange('keywords', e.target.value)}
                placeholder="콤마(,)로 구분"
                className="bg-white/50 focus:bg-white"
              />
            </div>
          </section>

          <Separator />
            {/* Research Design Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-700 font-display bg-stone-100 px-3 py-1.5 rounded-md inline-block">
                1. Research Design
              </h4>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Objectives</label>
                <DynamicList 
                  items={formData.purposes || []} 
                  onChange={(items) => handleChange('purposes', items)}
                  placeholder="연구 목적 입력"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                  <span className="text-sm font-medium text-stone-700">Qualitative</span>
                  <Switch 
                    checked={formData.isQualitative} 
                    onCheckedChange={(checked) => handleChange('isQualitative', checked)} 
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                  <span className="text-sm font-medium text-stone-700">Quantitative</span>
                  <Switch 
                    checked={formData.isQuantitative} 
                    onCheckedChange={(checked) => handleChange('isQuantitative', checked)} 
                  />
                </div>
              </div>

              {formData.isQualitative && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Qualitative Tools</label>
                  <DynamicList 
                    items={formData.qualTools || []} 
                    onChange={(items) => handleChange('qualTools', items)}
                    placeholder="질적 연구 도구 입력"
                  />
                </div>
              )}

              {formData.isQuantitative && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Quant Techniques</label>
                  <DynamicList 
                    items={formData.quantTechniques || []} 
                    onChange={(items) => handleChange('quantTechniques', items)}
                    placeholder="양적 분석 기법 입력"
                  />
                </div>
              )}
            </div>

            <Separator className="bg-stone-200/50" />

            {/* Variables Section (Conditional) */}
            {formData.isQuantitative && (
              <>
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-stone-700 font-display bg-stone-100 px-3 py-1.5 rounded-md inline-block">
                    2. Variables
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display text-blue-600">Independent (IV)</label>
                      <DynamicList 
                        items={formData.varsIndependent || []} 
                        onChange={(items) => handleChange('varsIndependent', items)}
                        placeholder="독립변수 입력"
                      />
                    </div>
                    
                     <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display text-red-600">Dependent (DV)</label>
                      <DynamicList 
                        items={formData.varsDependent || []} 
                        onChange={(items) => handleChange('varsDependent', items)}
                        placeholder="종속변수 입력"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display text-green-600">Moderator/Mediator</label>
                       <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <span className="text-[10px] text-stone-400">Moderator</span>
                            <DynamicList 
                              items={formData.varsModerator || []} 
                              onChange={(items) => handleChange('varsModerator', items)}
                              placeholder="조절변수"
                            />
                         </div>
                         <div className="space-y-1">
                            <span className="text-[10px] text-stone-400">Mediator</span>
                            <DynamicList 
                              items={formData.varsMediator || []} 
                              onChange={(items) => handleChange('varsMediator', items)}
                              placeholder="매개변수"
                            />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
                <Separator className="bg-stone-200/50" />
              </>
            )}

            {/* Key Results Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-700 font-display bg-stone-100 px-3 py-1.5 rounded-md inline-block">
                {formData.isQuantitative ? '3. Key Results' : '2. Key Results'}
              </h4>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Results</label>
                <DynamicList 
                  items={formData.results || []} 
                  onChange={(items) => handleChange('results', items)}
                  placeholder="주요 연구 결과"
                />
              </div>

               <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Limitations</label>
                <DynamicList 
                  items={formData.limitations || []} 
                  onChange={(items) => handleChange('limitations', items)}
                  placeholder="연구의 한계점"
                />
              </div>

               <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-display">Implications</label>
                <DynamicList 
                  items={formData.implications || []} 
                  onChange={(items) => handleChange('implications', items)}
                  placeholder="연구의 시사점"
                />
              </div>
            </div>

          <Separator />

          {/* Notes Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-stone-600" />
              <h3 className="font-bold text-stone-800 font-display">Research Notes</h3>
            </div>
            <Textarea 
              value={formData.userNotes || ''} 
              onChange={(e) => handleChange('userNotes', e.target.value)}
              className="min-h-[200px] bg-[#fdfcf8] border-stone-200 focus:border-[#d97757] focus:ring-[#d97757]/20 resize-none leading-relaxed p-4"
              placeholder="여기에 연구 메모를 작성하세요..."
            />
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
