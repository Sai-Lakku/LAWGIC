// types/index.ts

// Core statute structure
export interface Statute {
  id: string;
  title: string;
  text: string;
  citation?: string;
  category?: string;
  keywords?: string[];
  rules?: RuleBlock[];
  metadata?: {
    source?: string;
    lastUpdated?: string;
    jurisdiction?: string;
    status?: 'active' | 'repealed' | 'amended';
  };
}

// Rule structure for JSON Logic
export interface RuleBlock {
  rule: any; // JSON Logic rule object
  variables?: Variable[];
  description?: string;
  priority?: number;
}

// Variable definition
export interface Variable {
  name: string;
  type: 'boolean' | 'string' | 'number' | 'date';
  description: string;
  required?: boolean;
  defaultValue?: any;
}

// Search and matching results
export interface SearchResult {
  statute: Statute;
  matchType: 'rule' | 'keyword' | 'semantic';
  confidence: number;
  matchedVariables?: string[];
  matchedKeywords?: string[];
  explanation?: string;
  score?: number;
}

export interface MatchResult extends SearchResult {
  ruleMatches?: Array<{
    ruleIndex: number;
    matched: boolean;
    confidence: number;
    missingVariables: string[];
  }>;
}

// Variable extraction from natural language
export interface ExtractedVariable {
  name: string;
  value: boolean | string | number | Date;
  confidence: number;
  source: string; // The text that led to this extraction
  method: 'regex' | 'nlp' | 'keyword' | 'manual';
}

export interface VariableExtractionResult {
  variables: Record<string, any>;
  extractedVariables: ExtractedVariable[];
  suggestions: string[];
  confidence: number;
}

// API request/response types
export interface ChatbotRequest {
  message: string;
  context?: {
    previousMessages?: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;
    variables?: Record<string, any>;
    focusedStatutes?: string[];
  };
  options?: {
    includeExplanation?: boolean;
    maxResults?: number;
    minConfidence?: number;
  };
}

export interface ChatbotResponse {
  response: string;
  matches: SearchResult[];
  extractedVariables: VariableExtractionResult;
  followUpQuestions: string[];
  suggestedActions: Array<{
    type: 'clarify' | 'explore' | 'confirm';
    description: string;
    variables?: string[];
  }>;
  confidence: number;
  processingTime: number;
}

// Search configuration
export interface SearchOptions {
  minConfidence?: number;
  maxResults?: number;
  includeKeywordSearch?: boolean;
  includeRuleSearch?: boolean;
  includeSemanticSearch?: boolean;
  categories?: string[];
  jurisdictions?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
}

// Analysis types
export interface StatuteAnalysis {
  statuteId: string;
  title: string;
  applicable: boolean;
  confidence: number;
  matchedRules: Array<{
    ruleIndex: number;
    matched: boolean;
    confidence: number;
    requiredVariables: string[];
    providedVariables: string[];
    missingVariables: string[];
    explanation?: string;
  }>;
  explanation: string;
  recommendations?: string[];
}

export interface LegalAnalysis {
  scenario: string;
  applicableStatutes: StatuteAnalysis[];
  conflicts?: Array<{
    statute1: string;
    statute2: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  gaps?: Array<{
    description: string;
    suggestedStatutes?: string[];
  }>;
  summary: {
    totalStatutes: number;
    applicableCount: number;
    averageConfidence: number;
    primaryStatute?: {
      id: string;
      title: string;
      confidence: number;
    };
  };
  nextSteps?: string[];
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Frontend component prop types
export interface StatuteCardProps {
  statute: Statute;
  searchResult?: SearchResult;
  onSelect?: (statute: Statute) => void;
  onAnalyze?: (statute: Statute) => void;
  showConfidence?: boolean;
  compact?: boolean;
}

export interface VariableInputProps {
  variables: Variable[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onSubmit?: () => void;
  readonly?: boolean;
}

export interface SearchFilterProps {
  options: SearchOptions;
  onChange: (options: SearchOptions) => void;
  availableCategories?: string[];
  availableJurisdictions?: string[];
}

// Utility types
export type VariableType = Variable['type'];
export type MatchType = SearchResult['matchType'];
export type StatuteStatus = NonNullable<Statute['metadata']>['status'];

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  search: {
    defaultMinConfidence: number;
    defaultMaxResults: number;
    enableSemanticSearch: boolean;
  };
  ui: {
    defaultTheme: 'light' | 'dark' | 'system';
    showConfidenceScores: boolean;
    enableAdvancedFilters: boolean;
  };
  features: {
    enableVariableExtraction: boolean;
    enableFollowUpQuestions: boolean;
    enableStatuteRecommendations: boolean;
    enableConflictDetection: boolean;
  };
}