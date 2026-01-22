'use client';

import { useState } from 'react';
import { Paper } from '@/lib/db/papers';

interface PaperFormProps {
  initialData?: Partial<Paper>;
  onSubmit: (data: Partial<Paper>) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function PaperForm({ initialData, onSubmit, onCancel, isEditing = false }: PaperFormProps) {
  const [formData, setFormData] = useState<Partial<Paper>>({
    keywords: initialData?.keywords || '',
    author: initialData?.author || '',
    year: initialData?.year || new Date().getFullYear(),
    title: initialData?.title || '',
    publisher: initialData?.publisher || '',
    subject: initialData?.subject || '',
    purposes: initialData?.purposes || [''],
    isQualitative: initialData?.isQualitative || false,
    isQuantitative: initialData?.isQuantitative || false,
    qualTools: initialData?.qualTools || [''],
    varsIndependent: initialData?.varsIndependent || [''],
    varsDependent: initialData?.varsDependent || [''],
    varsModerator: initialData?.varsModerator || [''],
    varsMediator: initialData?.varsMediator || [''],
    varsOthers: initialData?.varsOthers || [''],
    quantTechniques: initialData?.quantTechniques || [''],
    results: initialData?.results || [''],
    limitations: initialData?.limitations || [''],
    implications: initialData?.implications || [''],
    futurePlans: initialData?.futurePlans || [''],
    userNotes: initialData?.userNotes || '',
    tags: initialData?.tags || [],
    isRead: initialData?.isRead || false,
    importance: initialData?.importance || 3,
  });

  const handleArrayChange = (field: keyof Paper, index: number, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: keyof Paper) => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData({ ...formData, [field]: [...currentArray, ''] });
  };

  const removeArrayItem = (field: keyof Paper, index: number) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? '논문 정보 수정' : '새 논문 추가'}
        </h2>
        {initialData && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {initialData.lastAnalyzedAt ? 'AI 분석됨' : '수동 입력'}
          </span>
        )}
      </div>

      {/* 기본 서지 정보 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-700 mb-3">📚 서지 정보</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="논문 제목을 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">저자 *</label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="저자명"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도 *</label>
            <input
              type="number"
              required
              min="1900"
              max={new Date().getFullYear() + 10}
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">출판사 / 학술지</label>
          <input
            type="text"
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="출판사 또는 학술지명"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주제</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="연구 주제"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">키워드</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="쉼표로 구분된 키워드"
          />
        </div>
      </div>

      {/* 연구 목적 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-700 mb-3">🎯 연구 목적</h3>
        {formData.purposes?.map((purpose, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={purpose}
              onChange={(e) => handleArrayChange('purposes', index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder={`연구 목적 ${index + 1}`}
            />
            {formData.purposes!.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('purposes', index)}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
              >
                삭제
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('purposes')}
          className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
        >
          + 목적 추가
        </button>
      </div>

      {/* 연구 설계 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-700 mb-3">🔬 연구 설계</h3>
        
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isQualitative}
              onChange={(e) => setFormData({ ...formData, isQualitative: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">질적 연구</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isQuantitative}
              onChange={(e) => setFormData({ ...formData, isQuantitative: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">양적 연구</span>
          </label>
        </div>

        {/* 질적 연구 도구 */}
        {formData.isQualitative && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-600">질적 연구 도구</h4>
            {formData.qualTools?.map((tool, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={tool}
                  onChange={(e) => handleArrayChange('qualTools', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="인터뷰, 관찰, 문서 분석 등"
                />
                {formData.qualTools!.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('qualTools', index)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('qualTools')}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 text-sm"
            >
              + 도구 추가
            </button>
          </div>
        )}

        {/* 양적 연구 변수 */}
        {formData.isQuantitative && (
          <div className="mt-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-600">연구 변수</h4>
            
            {/* 독립변수 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">독립변수</p>
              {formData.varsIndependent?.map((varItem, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={varItem}
                    onChange={(e) => handleArrayChange('varsIndependent', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="독립변수"
                  />
                  {formData.varsIndependent!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('varsIndependent', index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('varsIndependent')}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
              >
                + 추가
              </button>
            </div>

            {/* 종속변수 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">종속변수</p>
              {formData.varsDependent?.map((varItem, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={varItem}
                    onChange={(e) => handleArrayChange('varsDependent', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="종속변수"
                  />
                  {formData.varsDependent!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('varsDependent', index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('varsDependent')}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
              >
                + 추가
              </button>
            </div>

            {/* 분석 기법 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">분석 기법</p>
              {formData.quantTechniques?.map((technique, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={technique}
                    onChange={(e) => handleArrayChange('quantTechniques', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="회귀분석, t-검정 등"
                  />
                  {formData.quantTechniques!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('quantTechniques', index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('quantTechniques')}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
              >
                + 추가
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 연구 결과 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-700 mb-3">📊 연구 결과</h3>
        {formData.results?.map((result, index) => (
          <div key={index} className="flex gap-2">
            <textarea
              value={result}
              onChange={(e) => handleArrayChange('results', index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder={`주요 결과 ${index + 1}`}
              rows={2}
            />
            {formData.results!.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('results', index)}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
              >
                삭제
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('results')}
          className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
        >
          + 결과 추가
        </button>
      </div>

      {/* 메타 정보 */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg text-gray-700 mb-3">📝 메모 및 기타</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">개인 메모</label>
          <textarea
            value={formData.userNotes}
            onChange={(e) => setFormData({ ...formData, userNotes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="이 논문에 대한 개인적인 생각이나 메모를 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">중요도</label>
            <select
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>⭐ 1 - 낮음</option>
              <option value={2}>⭐⭐ 2</option>
              <option value={3}>⭐⭐⭐ 3 - 보통</option>
              <option value={4}>⭐⭐⭐⭐ 4</option>
              <option value={5}>⭐⭐⭐⭐⭐ 5 - 높음</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRead}
                onChange={(e) => setFormData({ ...formData, isRead: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">읽음</span>
            </label>
          </div>
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
        >
          {isEditing ? '수정 저장' : '논문 추가'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
