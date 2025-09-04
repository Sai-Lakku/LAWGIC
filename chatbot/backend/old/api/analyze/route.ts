// app/api/analyze/route.ts
import { Request, Response } from 'express';
import { loadAllStatutes } from '../../../loaders/statuteLoader';
import { extractVariablesFromInput, generateFollowUpQuestions } from '../../../lib/variableExtractor';
import { applyRule, extractVariablesFromRule } from '../../../lib/ruleEngine';

export interface AnalyzeRequest {
  scenarioInput: string;
  variables?: Record<string, any>;
  statuteIds?: string[]; // Analyze specific statutes
}

export interface AnalysisResult {
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
  }>;
  explanation: string;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult[];
  extractedVariables: {
    variables: Record<string, any>;
    extractedVariables: Array<{
      name: string;
      value: any;
      confidence: number;
      source: string;
    }>;
  };
  followUpQuestions: string[];
  summary: {
    totalStatutes: number;
    applicableStatutes: number;
    averageConfidence: number;
    mostLikelyStatute?: {
      id: string;
      title: string;
      confidence: number;
    };
  };
  processingTime: number;
}

export async function handleAnalyzeRequest(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body: AnalyzeRequest = req.body;
    const { scenarioInput, variables = {}, statuteIds } = body;

    if (!scenarioInput?.trim()) {
      res.status(400).json({
        analysis: [],
        extractedVariables: { variables: {}, extractedVariables: [] },
        followUpQuestions: [],
        summary: {
          totalStatutes: 0,
          applicableStatutes: 0,
          averageConfidence: 0
        },
        processingTime: Date.now() - startTime
      });
      return;
    }

    // Load statutes
    const allStatutes = await loadAllStatutes();
    
    if (!allStatutes || allStatutes.length === 0) {
      res.status(500).json({
        analysis: [],
        extractedVariables: { variables: {}, extractedVariables: [] },
        followUpQuestions: [],
        summary: {
          totalStatutes: 0,
          applicableStatutes: 0,
          averageConfidence: 0
        },
        processingTime: Date.now() - startTime
      });
      return;
    }

    // Filter to specific statutes if requested
    const statutes = statuteIds && statuteIds.length > 0
      ? allStatutes.filter(statute => statute.id && statuteIds.includes(statute.id))
      : allStatutes;

    // Extract variables from natural language input
    const extractionResult = extractVariablesFromInput(scenarioInput);
    
    // Merge extracted variables with provided variables
    const finalVariables = {
      ...extractionResult.variables,
      ...variables
    };

    // Analyze each statute
    const analysis: AnalysisResult[] = [];
    
    for (const statute of statutes) {
      const result = analyzeStatute(statute, finalVariables);
      analysis.push(result);
    }

    // Generate follow-up questions
    const allVariables = Array.from(new Set(
      statutes.flatMap(statute => 
        statute.rules?.flatMap((rule: any) => 
          extractVariablesFromRule(rule.rule) || []
        ) || []
      )
    ));
    
    const followUpQuestions = generateFollowUpQuestions(finalVariables, allVariables);

    // Calculate summary statistics
    const applicableAnalysis = analysis.filter(a => a.applicable);
    const totalConfidence = analysis.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = analysis.length > 0 ? totalConfidence / analysis.length : 0;
    
    const mostLikelyStatute = analysis.reduce((best, current) => 
      (!best || current.confidence > best.confidence) ? current : best
    , null as AnalysisResult | null);

    const summary = {
      totalStatutes: analysis.length,
      applicableStatutes: applicableAnalysis.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      mostLikelyStatute: mostLikelyStatute ? {
        id: mostLikelyStatute.statuteId,
        title: mostLikelyStatute.title,
        confidence: mostLikelyStatute.confidence
      } : undefined
    };

    res.status(200).json({
      analysis: analysis.sort((a, b) => b.confidence - a.confidence),
      extractedVariables: extractionResult,
      followUpQuestions,
      summary,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Analyze API error:', error);
    
    res.status(500).json({
      analysis: [],
      extractedVariables: { variables: {}, extractedVariables: [] },
      followUpQuestions: [],
      summary: {
        totalStatutes: 0,
        applicableStatutes: 0,
        averageConfidence: 0
      },
      processingTime: Date.now() - startTime
    });
  }
}

function analyzeStatute(statute: any, variables: Record<string, any>): AnalysisResult {
  const matchedRules: AnalysisResult['matchedRules'] = [];
  let overallApplicable = false;
  let maxConfidence = 0;

  if (statute.rules && statute.rules.length > 0) {
    statute.rules.forEach((ruleBlock: any, index: number) => {
      const rule = ruleBlock.rule;
      const requiredVariables = extractVariablesFromRule(rule);
      const providedVariables = requiredVariables.filter(varName => 
        variables[varName] !== undefined && variables[varName] !== null
      );
      const missingVariables = requiredVariables.filter(varName => 
        variables[varName] === undefined || variables[varName] === null
      );

      const matched = applyRule(rule, variables);
      const confidence = requiredVariables.length > 0 ? providedVariables.length / requiredVariables.length : 0;

      if (matched) {
        overallApplicable = true;
      }

      maxConfidence = Math.max(maxConfidence, confidence);

      matchedRules.push({
        ruleIndex: index,
        matched,
        confidence: Math.round(confidence * 100) / 100,
        requiredVariables,
        providedVariables,
        missingVariables
      });
    });
  } else {
    // If no rules, base on keyword matching confidence
    maxConfidence = 0.1; // Low baseline confidence
  }

  // Generate explanation
  let explanation = '';
  if (overallApplicable) {
    const matchedRuleCount = matchedRules.filter(r => r.matched).length;
    explanation = `This statute applies to your scenario. ${matchedRuleCount} of ${matchedRules.length} rules matched.`;
  } else if (maxConfidence > 0.5) {
    explanation = `This statute partially matches your scenario (${Math.round(maxConfidence * 100)}% of variables provided). Additional information needed.`;
  } else {
    explanation = `This statute does not appear to apply to your scenario based on the provided information.`;
  }

  return {
    statuteId: statute.id,
    title: statute.title,
    applicable: overallApplicable,
    confidence: Math.round(maxConfidence * 100) / 100,
    matchedRules,
    explanation
  };
}