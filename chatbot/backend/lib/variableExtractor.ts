// lib/variableExtractor.ts

export interface ExtractedVariable {
  name: string;
  value: boolean | string | number;
  confidence: number;
  source: string; // The text that led to this extraction
}

export interface VariableExtractionResult {
  variables: Record<string, any>;
  extractedVariables: ExtractedVariable[];
  suggestions: string[];
}

/**
 * Extracts variables from natural language user input
 */
export function extractVariablesFromInput(userInput: string): VariableExtractionResult {
  const extractedVariables: ExtractedVariable[] = [];
  const suggestions: string[] = [];

  // Define patterns for common legal/statutory variables
  const patterns = [
    // Boolean patterns
    {
      regex: /(?:was|is|has been|have been|did)\s+(?:an?\s+)?(?:written\s+)?offer\s+(?:made|sent|given|provided)/i,
      variable: 'offer_made',
      value: true,
      confidence: 0.9
    },
    {
      regex: /(?:no|not|never|didn't|wasn't|hasn't)\s+(?:receive|get|made|send)\s+(?:an?\s+)?offer/i,
      variable: 'offer_made',
      value: false,
      confidence: 0.8
    },
    {
      regex: /governor\s+(?:accepted|agreed|approved|accepted)/i,
      variable: 'governor_accepted',
      value: true,
      confidence: 0.9
    },
    {
      regex: /governor\s+(?:rejected|declined|refused|denied)/i,
      variable: 'governor_accepted',
      value: false,
      confidence: 0.9
    },
    {
      regex: /certificate\s+(?:was|has been|is)\s+(?:filed|submitted|lodged)/i,
      variable: 'certificate_filed',
      value: true,
      confidence: 0.9
    },
    {
      regex: /certificate\s+(?:wasn't|was not|hasn't been|not)\s+(?:filed|submitted)/i,
      variable: 'certificate_filed',
      value: false,
      confidence: 0.9
    },
    {
      regex: /duplicate\s+(?:was|has been|is)\s+(?:recorded|filed|registered)/i,
      variable: 'duplicate_recorded',
      value: true,
      confidence: 0.9
    },
    {
      regex: /duplicate\s+(?:wasn't|was not|hasn't been|not)\s+(?:recorded|filed|registered)/i,
      variable: 'duplicate_recorded',
      value: false,
      confidence: 0.9
    },
    {
      regex: /(?:federal|state)\s+government\s+(?:sent|made|provided)/i,
      variable: 'federal_offer',
      value: true,
      confidence: 0.8
    },
    {
      regex: /(?:within|before|after)\s+(\d+)\s+days?/i,
      variable: 'time_limit_days',
      value: (match: RegExpMatchArray) => parseInt(match[1]),
      confidence: 0.8
    },
    {
      regex: /written\s+(?:notice|notification|offer|request)/i,
      variable: 'written_notice',
      value: true,
      confidence: 0.7
    },
    {
      regex: /(?:oral|verbal|spoken)\s+(?:notice|notification|offer|request)/i,
      variable: 'written_notice',
      value: false,
      confidence: 0.7
    },
    {
      regex: /land\s+(?:was|is|has been)\s+(?:retroceded|transferred|returned)/i,
      variable: 'retrocession_completed',
      value: true,
      confidence: 0.8
    },
    {
      regex: /(?:before|prior to)\s+(?:statehood|becoming a state)/i,
      variable: 'before_statehood',
      value: true,
      confidence: 0.8
    },
    {
      regex: /(?:after|following)\s+(?:statehood|becoming a state)/i,
      variable: 'before_statehood',
      value: false,
      confidence: 0.8
    }
  ];

  // Extract variables using patterns
  for (const pattern of patterns) {
    const matches = userInput.match(pattern.regex);
    if (matches) {
      let value: any;
      
      if (typeof pattern.value === 'function') {
        value = pattern.value(matches);
      } else {
        value = pattern.value;
      }

      extractedVariables.push({
        name: pattern.variable,
        value,
        confidence: pattern.confidence,
        source: matches[0]
      });
    }
  }

  // Build final variables object (taking highest confidence for duplicates)
  const variables: Record<string, any> = {};
  const variableMap = new Map<string, ExtractedVariable>();

  for (const extracted of extractedVariables) {
    const existing = variableMap.get(extracted.name);
    if (!existing || extracted.confidence > existing.confidence) {
      variableMap.set(extracted.name, extracted);
      variables[extracted.name] = extracted.value;
    }
  }

  // Generate suggestions for common missing variables
  const commonVariables = [
    'offer_made',
    'governor_accepted', 
    'certificate_filed',
    'duplicate_recorded',
    'written_notice',
    'federal_offer',
    'retrocession_completed',
    'before_statehood'
  ];

  for (const varName of commonVariables) {
    if (!variables[varName]) {
      suggestions.push(`Did you mean to specify whether ${varName.replace(/_/g, ' ')}?`);
    }
  }

  return {
    variables,
    extractedVariables: Array.from(variableMap.values()),
    suggestions: suggestions.slice(0, 3) // Limit suggestions
  };
}

/**
 * Generates follow-up questions for missing critical variables
 */
export function generateFollowUpQuestions(
  extractedVariables: Record<string, any>,
  statuteVariables: string[]
): string[] {
  const questions: string[] = [];
  const questionTemplates: Record<string, string> = {
    'offer_made': 'Was a formal offer made by the federal government?',
    'governor_accepted': 'Did the governor accept the offer?',
    'certificate_filed': 'Was a certificate filed with the appropriate authority?',
    'duplicate_recorded': 'Was a duplicate copy recorded?',
    'written_notice': 'Was the notice provided in writing?',
    'federal_offer': 'Did the offer come from the federal government?',
    'retrocession_completed': 'Has the retrocession been completed?',
    'before_statehood': 'Did this occur before statehood?',
    'time_limit_days': 'What was the time limit in days?',
    'state_legislature_approved': 'Did the state legislature approve this action?'
  };

  // Prioritize questions for variables that appear in multiple statutes
  const variablePriority = statuteVariables
    .filter(varName => !extractedVariables[varName])
    .slice(0, 5); // Limit to 5 questions

  for (const varName of variablePriority) {
    if (questionTemplates[varName]) {
      questions.push(questionTemplates[varName]);
    }
  }

  return questions;
}

/**
 * Validates extracted variables against expected types
 */
export function validateVariables(
  variables: Record<string, any>,
  schema?: Record<string, string>
): Record<string, any> {
  if (!schema) return variables;

  const validated: Record<string, any> = {};

  for (const [key, value] of Object.entries(variables)) {
    const expectedType = schema[key];
    
    if (!expectedType) {
      validated[key] = value;
      continue;
    }

    try {
      switch (expectedType) {
        case 'boolean':
          validated[key] = Boolean(value);
          break;
        case 'number':
          validated[key] = typeof value === 'number' ? value : parseFloat(String(value));
          break;
        case 'string':
          validated[key] = String(value);
          break;
        default:
          validated[key] = value;
      }
    } catch (error) {
      console.warn(`Failed to validate variable ${key}:`, error);
      validated[key] = value;
    }
  }

  return validated;
}