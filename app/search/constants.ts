import {
  Search,
  BookOpen,
  Database,
  Beaker,
  GraduationCap,
  Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SearchSourceConfig {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hoverColor: string;
  activeColor: string;
  disabled?: boolean;
}

export const searchSources: SearchSourceConfig[] = [
  {
    value: 'semantic_scholar',
    label: 'Semantic Scholar',
    shortLabel: 'S2',
    description: 'AI-powered academic search',
    icon: Database,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    activeColor: 'bg-blue-50 border-blue-500 text-blue-700',
  },
  {
    value: 'google_scholar',
    label: 'Google Scholar',
    shortLabel: 'GS',
    description: 'Comprehensive search',
    icon: Search,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    activeColor: 'bg-blue-50 border-blue-600 text-blue-700',
  },
  {
    value: 'arxiv',
    label: 'arXiv',
    shortLabel: 'arXiv',
    description: 'Preprints & open access',
    icon: Beaker,
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-50 hover:border-red-300',
    activeColor: 'bg-red-50 border-red-500 text-red-700',
  },
  {
    value: 'pubmed',
    label: 'PubMed',
    shortLabel: 'PM',
    description: 'Biomedical & life sciences',
    icon: GraduationCap,
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-50 hover:border-green-300',
    activeColor: 'bg-green-50 border-green-500 text-green-700',
  },
  {
    value: 'crossref',
    label: 'Crossref',
    shortLabel: 'CR',
    description: 'DOI registry',
    icon: Globe,
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-50 hover:border-purple-300',
    activeColor: 'bg-purple-50 border-purple-500 text-purple-700',
  },
  {
    value: 'kci',
    label: 'KCI',
    shortLabel: 'KCI',
    description: 'Korea Citation Index',
    disabled: true,
    icon: BookOpen,
    color: 'bg-stone-400',
    hoverColor: '',
    activeColor: '',
  },
  {
    value: 'riss',
    label: 'RISS',
    shortLabel: 'RISS',
    description: 'Korean research',
    disabled: true,
    icon: BookOpen,
    color: 'bg-stone-400',
    hoverColor: '',
    activeColor: '',
  },
];

export const fieldsOfStudy = [
  { value: 'all', label: '모든 분야' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Psychology', label: 'Psychology' },
  { value: 'Economics', label: 'Economics' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Environmental Science', label: 'Environmental Science' },
];

export const yearRanges = [
  { value: 'all', label: '전체 연도' },
  { value: '2024-2026', label: '최근 2년' },
  { value: '2020-2026', label: '최근 5년' },
  { value: '2015-2026', label: '최근 10년' },
  { value: '2000-2026', label: '2000년 이후' },
];

export const quickSearches = [
  'machine learning',
  'deep learning',
  'natural language processing',
  'computer vision',
  'transformer',
];

export type SortField = 'relevance' | 'year' | 'citations';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'card' | 'table';
