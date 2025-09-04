// lib/searchEngine.ts
import { applyRule, calculateRuleConfidence, extractVariablesFromRule } from './ruleEngine';
import { Statute } from '../types/statutes';

export interface SearchResult {
  statute: Statute;
  matchType: 'rule' | 'keyword' | 'semantic';
  confidence: number;
  matchedVariables?: string[];
  matchedKeywords?: string[];
  explanation?: string;
}

export interface SearchOptions {
  minConfidence?: number;
  maxResults?: number;
  includeKeywordSearch?: boolean;
  includeRuleSearch?: boolean;
}

/**
 * Main search function that combines rule-based and keyword matching
 */
export function searchStatutes(
  statutes: Statute[],
  userInput: string,
  variables: Record<string, any> = {},
  options: SearchOptions = {}
): SearchResult[] {
  const {
    minConfidence = 0.1,
    maxResults = 10,
    includeKeywordSearch = true,
    includeRuleSearch = true
  } = options;

  const results: SearchResult[] = [];

  for (const statute of statutes) {
    // Rule-based matching
    if (includeRuleSearch && statute.rules) {
      for (const ruleBlock of statute.rules) {
        if (applyRule(ruleBlock.rule, variables)) {
          const confidence = calculateRuleConfidence(ruleBlock.rule, variables);
          const matchedVariables = extractVariablesFromRule(ruleBlock.rule)
            .filter(varName => variables[varName] !== undefined);

          results.push({
            statute,
            matchType: 'rule',
            confidence: Math.max(confidence, 0.8), // Rule matches get high confidence
            matchedVariables,
            explanation: `Rule matched based on variables: ${matchedVariables.join(', ')}`
          });
        } else {
          // Partial rule matching for high-confidence partial matches
          const confidence = calculateRuleConfidence(ruleBlock.rule, variables);
          if (confidence >= 0.7) {
            const matchedVariables = extractVariablesFromRule(ruleBlock.rule)
              .filter(varName => variables[varName] !== undefined);

            results.push({
              statute,
              matchType: 'rule',
              confidence: confidence * 0.6, // Reduce confidence for partial matches
              matchedVariables,
              explanation: `Partial rule match (${Math.round(confidence * 100)}% of variables matched)`
            });
          }
        }
      }
    }

    // Keyword-based matching
    if (includeKeywordSearch) {
      const keywordMatch = performKeywordSearch(statute, userInput);
      if (keywordMatch.confidence >= minConfidence) {
        results.push({
          ...keywordMatch,
          statute
        });
      }
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueResults = deduplicateResults(results);
  
  return uniqueResults
    .filter(result => result.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

/**
 * Performs keyword-based search on statute content
 */
export function performKeywordSearch(
  statute: Statute,
  userInput: string
): Omit<SearchResult, 'statute'> {
  const searchTerms = extractSearchTerms(userInput);
  const matchedKeywords: string[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  const searchFields: { content: string; weight: number }[] = [
    { content: statute.title || '', weight: 3 },
    { content: statute.text || '', weight: 2 },
    { content: statute.keywords?.join(' ') || '', weight: 2.5 },
    { content: statute.category || '', weight: 1.5 }
  ];

  for (const term of searchTerms) {
    maxPossibleScore += 3; // Max weight per term

    for (const field of searchFields) {
      if (field.content.toLowerCase().includes(term.toLowerCase())) {
        totalScore += field.weight;
        matchedKeywords.push(term);
        break; // Only count each term once
      }
    }
  }

  const confidence =
    maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

  return {
    matchType: 'keyword',
    confidence: Math.min(confidence, 0.9), // Cap confidence
    matchedKeywords: Array.from(new Set(matchedKeywords)), // Deduplicate
    explanation: `Keyword match: ${matchedKeywords.join(', ')}`
  };
}
/**
 * Extracts meaningful search terms from user input
 */
function extractSearchTerms(input: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
  ]);

  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 terms for performance
}

/**
 * Removes duplicate results (same statute with lower confidence)
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const statuteMap = new Map<string, SearchResult>();

  for (const result of results) {
    const statuteId = result.statute.id;

    if (!statuteId) {
      console.warn("Skipping result with missing statute.id:", result);
      continue; // Skip statutes without a valid ID
    }

    const existing = statuteMap.get(statuteId);

    if (!existing || result.confidence > existing.confidence) {
      statuteMap.set(statuteId, result);
    }
  }

  return Array.from(statuteMap.values());
}


/**
 * Suggests missing variables that might improve search results
 */
export function suggestMissingVariables(
  statutes: Statute[],
  currentVariables: Record<string, any>
): string[] {
  const allVariables = new Set<string>();
  
  for (const statute of statutes) {
    if (statute.rules) {
      for (const ruleBlock of statute.rules) {
        const vars = extractVariablesFromRule(ruleBlock.rule);
        vars.forEach(v => allVariables.add(v));
      }
    }
  }

  const currentVarNames = Object.keys(currentVariables);
  return Array.from(allVariables).filter(v => !currentVarNames.includes(v));
}