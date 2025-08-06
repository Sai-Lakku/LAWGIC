// app/api/match/route.ts
import { Request, Response } from 'express';
import { loadAllStatutes } from '../../../loaders/statuteLoader';
import { searchStatutes, SearchOptions } from '../../../lib/searchEngine';
import { extractVariablesFromInput, generateFollowUpQuestions } from '../../../lib/variableExtractor';

export interface MatchRequest {
  scenarioInput: string;
  variables?: Record<string, any>;
  options?: SearchOptions;
}

export interface MatchResponse {
  matches: Array<{
    statute: any;
    matchType: 'rule' | 'keyword' | 'semantic';
    confidence: number;
    matchedVariables?: string[];
    matchedKeywords?: string[];
    explanation?: string;
  }>;
  extractedVariables: {
    variables: Record<string, any>;
    extractedVariables: Array<{
      name: string;
      value: any;
      confidence: number;
      source: string;
    }>;
    suggestions: string[];
  };
  followUpQuestions?: string[];
  processingTime: number;
  totalStatutes: number;
  error?: string;
}

export async function handleMatchRequest(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body: MatchRequest = req.body;
    const { scenarioInput, variables = {}, options = {} } = body;

    if (!scenarioInput?.trim()) {
      res.status(400).json({
        matches: [],
        extractedVariables: { variables: {}, extractedVariables: [], suggestions: [] },
        processingTime: Date.now() - startTime,
        totalStatutes: 0,
        error: 'Scenario input is required'
      });
      return;
    }

    // Load statutes
    const statutes = await loadAllStatutes();
    
    if (!statutes || statutes.length === 0) {
      res.status(500).json({
        matches: [],
        extractedVariables: { variables: {}, extractedVariables: [], suggestions: [] },
        processingTime: Date.now() - startTime,
        totalStatutes: 0,
        error: 'No statutes found'
      });
      return;
    }

    // Extract variables from natural language input
    const extractionResult = extractVariablesFromInput(scenarioInput);
    
    // Merge extracted variables with provided variables (provided takes precedence)
    const finalVariables = {
      ...extractionResult.variables,
      ...variables
    };

    // Get all variable names used in statutes for follow-up questions
    const statuteVariables = Array.from(new Set(
      statutes.flatMap(statute => 
        statute.rules?.flatMap((rule: any) => 
          extractVariablesFromRule(rule.rule) || []
        ) || []
      )
    ));

    // Generate follow-up questions
    const followUpQuestions = generateFollowUpQuestions(finalVariables, statuteVariables);

    // Search for matching statutes
    const searchOptions: SearchOptions = {
      minConfidence: 0.1,
      maxResults: 10,
      includeKeywordSearch: true,
      includeRuleSearch: true,
      ...options
    };

    const matches = statutes ? searchStatutes(statutes, scenarioInput, finalVariables, searchOptions) : [];

    res.status(200).json({
      matches,
      extractedVariables: extractionResult,
      followUpQuestions,
      processingTime: Date.now() - startTime,
      totalStatutes: statutes.length
    });

  } catch (error) {
    console.error('Match API error:', error);
    
    res.status(500).json({
      matches: [],
      extractedVariables: { variables: {}, extractedVariables: [], suggestions: [] },
      processingTime: Date.now() - startTime,
      totalStatutes: 0,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

// Helper function to extract variable names from rules
function extractVariablesFromRule(rule: any): string[] {
  const variables = new Set<string>();
  
  function traverse(obj: any) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          if (key === 'var' && typeof value === 'string') {
            variables.add(value);
          } else {
            traverse(value);
          }
        });
      }
    }
  }
  
  traverse(rule);
  return Array.from(variables);
}