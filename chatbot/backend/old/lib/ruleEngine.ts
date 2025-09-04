// lib/ruleEngine.ts
import * as jsonLogic from 'json-logic-js';

/**
 * Applies a JSON Logic rule against provided variables
 */
export function applyRule(rule: any, variables: Record<string, any>): boolean {
  try {
    const result = jsonLogic.apply(rule, variables);
    return Boolean(result);
  } catch (err) {
    console.error("Rule evaluation error:", err, { rule, variables });
    return false;
  }
}

/**
 * Extracts all variable names referenced in a JSON Logic rule
 */
export function extractVariablesFromRule(rule: any): string[] {
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

/**
 * Calculates confidence score for rule matching
 */
export function calculateRuleConfidence(
  rule: any, 
  variables: Record<string, any>
): number {
  const requiredVars = extractVariablesFromRule(rule);
  const providedVars = Object.keys(variables).filter(key => 
    variables[key] !== undefined && variables[key] !== null
  );
  
  if (requiredVars.length === 0) return 0;
  
  const matchedVars = requiredVars.filter(varName => 
    providedVars.includes(varName)
  );
  
  return matchedVars.length / requiredVars.length;
}