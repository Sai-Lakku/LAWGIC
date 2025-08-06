// backend/app/api/search/route.ts
import { Request, Response, Router } from 'express';
import { loadAllStatutes } from '../../../loaders/statuteLoader';
import { searchStatutes, SearchOptions } from '../../../lib/searchEngine';

export interface SearchRequest {
  query: string;
  filters?: {
    minConfidence?: number;
    matchTypes?: ('rule' | 'keyword' | 'semantic')[];
  };
  limit?: number;
}

export interface SearchResponse {
  results: Array<{
    statute: any;
    matchType: 'rule' | 'keyword' | 'semantic';
    confidence: number;
    matchedVariables?: string[];
    matchedKeywords?: string[];
    explanation?: string;
  }>;
  query: string;
  totalResults: number;
  processingTime: number;
  filters?: any;
  error?: string;
}

// Create an Express router
const router = Router();

// GET /api/search?q=...&limit=...
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const query = (req.query.q as string) || (req.query.query as string) || '';
  const minConfidence = parseFloat((req.query.minConfidence as string) || '0.1');
  const limit = parseInt((req.query.limit as string) || '10', 10);

  await performSearch(
    query,
    {
        filters: { minConfidence }, limit,
        query: ''
    },
    startTime,
    res
  );
});

// POST /api/search  { query, filters, limit }
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const body = req.body as SearchRequest;
  if (!body || typeof body.query !== 'string') {
    return res.status(400).json({
      results: [],
      query: '',
      totalResults: 0,
      processingTime: Date.now() - startTime,
      error: 'Invalid request body'
    } as SearchResponse);
  }

  await performSearch(body.query, body, startTime, res);
});

// Shared search logic
async function performSearch(
  query: string,
  request: SearchRequest,
  startTime: number,
  res: Response
) {
  try {
    if (!query?.trim()) {
      return res.json({
        results: [],
        query,
        totalResults: 0,
        processingTime: Date.now() - startTime,
        filters: request.filters
      } as SearchResponse);
    }

    // Load statutes
    const allStatutes = await loadAllStatutes();
    if (!allStatutes || allStatutes.length === 0) {
      return res.status(500).json({
        results: [],
        query,
        totalResults: 0,
        processingTime: Date.now() - startTime,
        error: 'No statutes available'
      } as SearchResponse);
    }

    // Configure search options
    const searchOptions: SearchOptions = {
      minConfidence: request.filters?.minConfidence || 0.1,
      maxResults: request.limit || 10,
      includeKeywordSearch:
        !request.filters?.matchTypes ||
        request.filters.matchTypes.includes('keyword'),
      includeRuleSearch:
        !request.filters?.matchTypes ||
        request.filters.matchTypes.includes('rule')
    };

    // Perform search
    const results = allStatutes ? searchStatutes(allStatutes, query, searchOptions) : [];

    // Filter by match types if specified
    const filteredResults = request.filters?.matchTypes
      ? results.filter((result) => request.filters!.matchTypes!.includes(result.matchType))
      : results;

    return res.json({
      results: filteredResults,
      query,
      totalResults: filteredResults.length,
      processingTime: Date.now() - startTime,
      filters: request.filters
    } as SearchResponse);
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      results: [],
      query,
      totalResults: 0,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Search failed'
    } as SearchResponse);
  }
}

export default router;
