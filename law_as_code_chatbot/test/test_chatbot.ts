import dotenv from 'dotenv';
import OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

const CHATBOT_API_URL = process.env.CHATBOT_API_URL || 'http://localhost:3000/api/chat';

interface TestCase {
  id: string;
  prompt: string;
  expectedStatutes: string[];
  category: string;
}

interface TestResult {
  testId: string;
  prompt: string;
  response: string;
  expectedStatutes: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
  statuteAccuracyScore: number;
  hallucinationScore: number;
  relevanceScore: number;
  timestamp: string;
  category: string;
}

async function callChatbot(prompt: string): Promise<string> {
  try {
    const response = await fetch(CHATBOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    return fullResponse;
  } catch (error) {
    console.error('Error calling chatbot:', error);
    throw error;
  }
}

function detectDuplicates(responses: Map<string, string>): Map<string, string> {
  const duplicates = new Map<string, string>();
  const seen = new Map<string, string>();

  for (const [id, response] of responses.entries()) {
    const normalized = response.toLowerCase().trim();
    
    if (seen.has(normalized)) {
      duplicates.set(id, seen.get(normalized)!);
    } else {
      seen.set(normalized, id);
    }
  }

  return duplicates;
}

async function evaluateStatuteAccuracy(
  response: string,
  expectedStatutes: string[]
): Promise<number> {
  const prompt = `Evaluate the accuracy of statute references in this legal response.

Response: ${response}

Expected statutes: ${expectedStatutes.join(', ')}

Rate the accuracy from 0.0 to 1.0 where:
- 1.0 means all expected statutes are correctly referenced and accurate
- 0.5 means some statutes are correct but incomplete or partially accurate
- 0.0 means statutes are missing, incorrect, or misrepresented

Return only a number between 0.0 and 1.0.`;

  try {
    const evaluation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const score = parseFloat(evaluation.choices[0]?.message?.content || '0');
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Error evaluating statute accuracy:', error);
    return 0;
  }
}

async function evaluateHallucination(response: string): Promise<number> {
  const prompt = `Evaluate this legal response for hallucinations or fabricated information about Minnesota statutes.

Response: ${response}

Rate from 0.0 to 1.0 where:
- 1.0 means no hallucinations, all information appears factual and grounded
- 0.5 means minor unsupported claims or vague statements
- 0.0 means significant fabricated information or false statute references

Return only a number between 0.0 and 1.0.`;

  try {
    const evaluation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const score = parseFloat(evaluation.choices[0]?.message?.content || '0');
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Error evaluating hallucination:', error);
    return 0;
  }
}

async function evaluateRelevance(prompt: string, response: string): Promise<number> {
  const evaluationPrompt = `Evaluate how relevant this response is to the question asked.

Question: ${prompt}

Response: ${response}

Rate from 0.0 to 1.0 where:
- 1.0 means directly answers the question with relevant information
- 0.5 means partially relevant but includes tangential information
- 0.0 means completely off-topic or unrelated

Return only a number between 0.0 and 1.0.`;

  try {
    const evaluation = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.1,
    });

    const score = parseFloat(evaluation.choices[0]?.message?.content || '0');
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Error evaluating relevance:', error);
    return 0;
  }
}

async function logToLangfuse(result: TestResult) {
  try {
    const trace = langfuse.trace({
      name: 'chatbot_test',
      userId: 'test_suite',
      metadata: {
        testId: result.testId,
        category: result.category,
      },
    });

    trace.generation({
      name: 'test_execution',
      input: result.prompt,
      output: result.response,
      metadata: {
        isDuplicate: result.isDuplicate,
        duplicateOf: result.duplicateOf,
        statuteAccuracyScore: result.statuteAccuracyScore,
        hallucinationScore: result.hallucinationScore,
        relevanceScore: result.relevanceScore,
        expectedStatutes: result.expectedStatutes,
      },
    });

    await langfuse.flushAsync();
  } catch (error) {
    console.error('Error logging to Langfuse:', error);
  }
}

async function runTests() {
  console.log('Loading test cases...');
  
  const testCasesPath = path.join(__dirname, 'test_cases.json');
  const testCases: TestCase[] = JSON.parse(
    fs.readFileSync(testCasesPath, 'utf-8')
  );

  console.log(`Loaded ${testCases.length} test cases`);
  console.log(`Using chatbot API: ${CHATBOT_API_URL}`);
  console.log('Starting test execution...\n');

  const responses = new Map<string, string>();
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.id}`);
    
    try {
      const response = await callChatbot(testCase.prompt);
      responses.set(testCase.id, response);

      console.log(`Evaluating response for ${testCase.id}...`);
      
      const [statuteScore, hallucinationScore, relevanceScore] = await Promise.all([
        evaluateStatuteAccuracy(response, testCase.expectedStatutes),
        evaluateHallucination(response),
        evaluateRelevance(testCase.prompt, response),
      ]);

      const result: TestResult = {
        testId: testCase.id,
        prompt: testCase.prompt,
        response,
        expectedStatutes: testCase.expectedStatutes,
        isDuplicate: false,
        statuteAccuracyScore: statuteScore,
        hallucinationScore: hallucinationScore,
        relevanceScore: relevanceScore,
        timestamp: new Date().toISOString(),
        category: testCase.category,
      };

      results.push(result);
      console.log(`Completed ${testCase.id}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing ${testCase.id}:`, error);
    }
  }

  console.log('Detecting duplicates...');
  const duplicates = detectDuplicates(responses);

  for (const result of results) {
    if (duplicates.has(result.testId)) {
      result.isDuplicate = true;
      result.duplicateOf = duplicates.get(result.testId);
    }
  }

  console.log('Logging results to Langfuse...');
  for (const result of results) {
    await logToLangfuse(result);
  }

  const reportPath = path.join(__dirname, 'test_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const summary = {
    totalTests: results.length,
    duplicates: results.filter(r => r.isDuplicate).length,
    averageStatuteAccuracy:
      results.reduce((sum, r) => sum + r.statuteAccuracyScore, 0) / results.length,
    averageHallucinationScore:
      results.reduce((sum, r) => sum + r.hallucinationScore, 0) / results.length,
    averageRelevanceScore:
      results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length,
  };

  console.log('\nTest Summary:');
  console.log(`Total tests: ${summary.totalTests}`);
  console.log(`Duplicates found: ${summary.duplicates}`);
  console.log(`Average statute accuracy: ${summary.averageStatuteAccuracy.toFixed(2)}`);
  console.log(`Average hallucination score: ${summary.averageHallucinationScore.toFixed(2)}`);
  console.log(`Average relevance score: ${summary.averageRelevanceScore.toFixed(2)}`);
  console.log(`\nResults saved to ${reportPath}`);
}

runTests().catch(console.error);