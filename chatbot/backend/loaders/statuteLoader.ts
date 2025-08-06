import fs from 'fs';
import path from 'path';
import * as jsonLogic from 'json-logic-js';
import { Statute } from '../types/statutes';

// Path to all interpreted statutes
const statutesDir = path.join(process.cwd(), 'data', 'interpreted');

export async function loadAllStatutes(): Promise<Statute[]> {
  const files = fs.readdirSync(statutesDir);
  const statutes: Statute[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(statutesDir, file);
      const content = await fs.promises.readFile(filePath, 'utf-8');

      try {
        const data = JSON.parse(content);
        statutes.push(data);
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${file}:`, error);
      }
    }
  }

  return statutes;
}

/**
 * Finds statutes whose rules match the given input variables.
 * 
 * @param inputVars Object with variable values to test against statute rules.
 * @returns Array of statutes where at least one rule matched.
 */
export async function findMatchingStatutesByRules(inputVars: Record<string, any>): Promise<Statute[]> {
  const statutes = await loadAllStatutes();

  return statutes.filter((statute) => {
    if (!statute.rules || statute.rules.length === 0) {
      // No rules to evaluate; skip statute
      return false;
    }

    // Return true if any rule evaluates to true
    return statute.rules.some((ruleBlock) => {
      try {
        if (!ruleBlock.rule) return false;
        return jsonLogic.apply(ruleBlock.rule, inputVars) === true;
      } catch (error) {
        console.warn('Error evaluating rule:', error);
        return false;
      }
    });
  });
}

