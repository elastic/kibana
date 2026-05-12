/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  createEsqlResultEquivalenceEvaluator,
  ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME,
} from './esql_result_equivalence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockQueryResult {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
  error?: Error;
}

/**
 * Build a minimal ElasticsearchClient stub whose `esql.query` resolves or
 * rejects based on the provided query→result map.
 */
const createEsClient = (responses: Record<string, MockQueryResult>): ElasticsearchClient =>
  ({
    esql: {
      query: jest.fn(async ({ query }: { query: string }) => {
        const r = responses[query];
        if (r?.error) throw r.error;
        return { columns: r?.columns ?? [], values: r?.values ?? [] };
      }),
    },
  } as unknown as ElasticsearchClient);

const GOLD_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY user.name';
const CANDIDATE_QUERY = 'FROM logs-* | STATS total = COUNT(*) BY user.name';

/** Build evaluator params mimicking the framework shape. */
const params = (candidateQuery: string, goldQuery: string) => ({
  input: {},
  output: candidateQuery,
  expected: goldQuery,
  metadata: null,
});

/** Default extractors: output is the candidate query string, expected is gold. */
const defaultExtractors = {
  predictionExtractor: (output: unknown) => output as string,
  groundTruthExtractor: (expected: unknown) => expected as string,
};

/** Column descriptors reused across tests. */
const twoColumns = [
  { name: 'user.name', type: 'keyword' },
  { name: 'count', type: 'long' },
];

// ---------------------------------------------------------------------------

describe('createEsqlResultEquivalenceEvaluator', () => {
  describe('evaluator metadata', () => {
    it('uses the default name and CODE kind', () => {
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient: createEsClient({}),
        ...defaultExtractors,
      });
      expect(evaluator.name).toBe(ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME);
      expect(evaluator.kind).toBe('CODE');
    });

    it('honours a name override', () => {
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient: createEsClient({}),
        ...defaultExtractors,
        name: 'Custom Name',
      });
      expect(evaluator.name).toBe('Custom Name');
    });
  });

  // -------------------------------------------------------------------------
  describe('exact-match rows', () => {
    it('scores 1.0 and exact-match label when all rows are identical', async () => {
      const rows: unknown[][] = [
        ['alice', 10],
        ['bob', 5],
        ['carol', 3],
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: rows },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: rows },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
      expect(result.explanation).toContain('identical');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldRowCount).toBe(3);
      expect(meta.candidateRowCount).toBe(3);
      expect(meta.intersectionRowCount).toBe(3);
      expect(meta.jaccard).toBe(1);
    });

    it('scores 1.0 when rows are returned in different order (sortRows=true by default)', async () => {
      const goldRows: unknown[][] = [
        ['alice', 10],
        ['bob', 5],
      ];
      const candidateRows: unknown[][] = [
        ['bob', 5],
        ['alice', 10],
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: goldRows },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: candidateRows },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
    });

    it('scores 1.0 for a single matching row', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [['alice', 42]] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [['alice', 42]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.explanation).toContain('1 row');
    });
  });

  // -------------------------------------------------------------------------
  describe('partial-overlap rows', () => {
    it('returns Jaccard score for partially overlapping results', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns: twoColumns,
          values: [
            ['alice', 10],
            ['bob', 5],
            ['carol', 3],
          ],
        },
        [CANDIDATE_QUERY]: {
          columns: twoColumns,
          values: [
            ['alice', 10],
            ['bob', 5],
            ['dave', 8],
          ],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('partial-match');
      expect(result.explanation).toContain('Partial match');
      expect(result.explanation).toContain('Jaccard=0.500');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldRowCount).toBe(3);
      expect(meta.candidateRowCount).toBe(3);
      expect(meta.intersectionRowCount).toBe(2);
      expect(meta.jaccard).toBe(0.5);
    });

    it('handles duplicate rows correctly using multiset semantics', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns: twoColumns,
          values: [
            ['alice', 1],
            ['alice', 1],
            ['bob', 2],
          ],
        },
        [CANDIDATE_QUERY]: {
          columns: twoColumns,
          values: [
            ['alice', 1],
            ['carol', 3],
          ],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0.25);
      expect(result.label).toBe('partial-match');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.intersectionRowCount).toBe(1);
    });

    it('scores 0 and no-overlap label when result sets are completely disjoint', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [['bob', 5]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-overlap');
      expect(result.explanation).toContain('no overlap');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.intersectionRowCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('empty result sets', () => {
    it('scores 1.0 when both result sets are empty (vacuously equivalent)', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldRowCount).toBe(0);
      expect(meta.candidateRowCount).toBe(0);
      expect(meta.intersectionRowCount).toBe(0);
    });

    it('scores 0 when gold has rows but candidate is empty', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-overlap');
    });

    it('scores 0 when candidate has rows but gold is empty', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [['bob', 5]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-overlap');
    });
  });

  // -------------------------------------------------------------------------
  describe('execution failure', () => {
    it('returns scoreOnExecutionFailure (default 0) when gold query throws', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { error: new Error('index not found') },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('execution-failure');
      expect(result.explanation).toContain('Gold query failed');
      expect(result.explanation).toContain('index not found');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldError).toBe('index not found');
    });

    it('returns scoreOnExecutionFailure (default 0) when candidate query throws', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
        [CANDIDATE_QUERY]: { error: new Error('unknown field') },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('execution-failure');
      expect(result.explanation).toContain('Candidate query failed');
      expect(result.explanation).toContain('unknown field');
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.candidateError).toBe('unknown field');
    });

    it('honours a custom scoreOnExecutionFailure value', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { error: new Error('timeout') },
        [CANDIDATE_QUERY]: { columns: [], values: [] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        scoreOnExecutionFailure: 0.5,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('execution-failure');
    });

    it('uses scoreOnExecutionFailure when prediction extractor throws', async () => {
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient: createEsClient({}),
        predictionExtractor: () => {
          throw new Error('bad output shape');
        },
        groundTruthExtractor: (e: unknown) => e as string,
        scoreOnExecutionFailure: 0,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('error');
      expect(result.explanation).toContain('Prediction extractor threw');
      expect(result.explanation).toContain('bad output shape');
    });

    it('uses scoreOnExecutionFailure when ground truth extractor throws', async () => {
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient: createEsClient({}),
        predictionExtractor: (o: unknown) => o as string,
        groundTruthExtractor: () => {
          throw new Error('missing expected field');
        },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('error');
      expect(result.explanation).toContain('Ground truth extractor threw');
    });
  });

  // -------------------------------------------------------------------------
  describe('normalization — ignoreFields', () => {
    it('produces exact-match when only the ignored column differs', async () => {
      const columnsWithTs = [
        { name: '@timestamp', type: 'date' },
        { name: 'user.name', type: 'keyword' },
        { name: 'count', type: 'long' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns: columnsWithTs,
          values: [['2024-01-01T00:00:00Z', 'alice', 10]],
        },
        [CANDIDATE_QUERY]: {
          columns: columnsWithTs,
          values: [['2024-06-15T12:30:00Z', 'alice', 10]],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { ignoreFields: ['@timestamp'] },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
    });

    it('does NOT match when the relevant (non-ignored) column differs', async () => {
      const columnsWithTs = [
        { name: '@timestamp', type: 'date' },
        { name: 'user.name', type: 'keyword' },
        { name: 'count', type: 'long' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns: columnsWithTs,
          values: [['2024-01-01T00:00:00Z', 'alice', 10]],
        },
        [CANDIDATE_QUERY]: {
          columns: columnsWithTs,
          values: [['2024-01-01T00:00:00Z', 'alice', 99]],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { ignoreFields: ['@timestamp'] },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-overlap');
    });

    it('ignores multiple fields simultaneously', async () => {
      const columns = [
        { name: '@timestamp', type: 'date' },
        { name: '_id', type: 'keyword' },
        { name: 'user.name', type: 'keyword' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns,
          values: [['2024-01-01', 'id-aaa', 'alice']],
        },
        [CANDIDATE_QUERY]: {
          columns,
          values: [['2024-06-15', 'id-zzz', 'alice']],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { ignoreFields: ['@timestamp', '_id'] },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('normalization — floatTolerance', () => {
    it('produces exact-match when floats differ within tolerance', async () => {
      const columns = [{ name: 'avg_cpu', type: 'double' }];
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns, values: [[0.7234]] },
        [CANDIDATE_QUERY]: { columns, values: [[0.7248]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { floatTolerance: 2 },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
    });

    it('does NOT match when floats differ beyond tolerance', async () => {
      const columns = [{ name: 'avg_cpu', type: 'double' }];
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns, values: [[0.72]] },
        [CANDIDATE_QUERY]: { columns, values: [[0.85]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { floatTolerance: 2 },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-overlap');
    });

    it('applies tolerance only to numeric values (strings are unaffected)', async () => {
      const columns = [
        { name: 'label', type: 'keyword' },
        { name: 'score', type: 'double' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns,
          values: [['high', 0.9991]],
        },
        [CANDIDATE_QUERY]: {
          columns,
          values: [['high', 0.9998]],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { floatTolerance: 2 },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('normalization — combined options', () => {
    it('applies ignoreFields and floatTolerance together', async () => {
      const columns = [
        { name: '@timestamp', type: 'date' },
        { name: 'avg_latency_ms', type: 'double' },
        { name: 'host', type: 'keyword' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns,
          values: [['2024-01-01', 142.337, 'web-01']],
        },
        [CANDIDATE_QUERY]: {
          columns,
          values: [['2024-06-01', 142.412, 'web-01']],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { ignoreFields: ['@timestamp'], floatTolerance: 1 },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(0);
    });

    it('matches when both ignoreFields and floatTolerance align', async () => {
      const columns = [
        { name: '@timestamp', type: 'date' },
        { name: 'avg_latency_ms', type: 'double' },
        { name: 'host', type: 'keyword' },
      ];
      const esClient = createEsClient({
        [GOLD_QUERY]: {
          columns,
          values: [['2024-01-01', 142.37, 'web-01']],
        },
        [CANDIDATE_QUERY]: {
          columns,
          values: [['2024-06-01', 142.41, 'web-01']],
        },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
        normalize: { ignoreFields: ['@timestamp'], floatTolerance: 1 },
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(result.score).toBe(1);
      expect(result.label).toBe('exact-match');
    });
  });

  // -------------------------------------------------------------------------
  describe('metadata fields', () => {
    it('always includes goldQuery and candidateQuery in metadata on success', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [['alice', 10]] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldQuery).toBe(GOLD_QUERY);
      expect(meta.candidateQuery).toBe(CANDIDATE_QUERY);
    });

    it('includes goldQuery and candidateQuery in metadata on execution failure', async () => {
      const esClient = createEsClient({
        [GOLD_QUERY]: { error: new Error('oops') },
        [CANDIDATE_QUERY]: { columns: twoColumns, values: [] },
      });
      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      const result = await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      const meta = result.metadata as Record<string, unknown>;
      expect(meta.goldQuery).toBe(GOLD_QUERY);
      expect(meta.candidateQuery).toBe(CANDIDATE_QUERY);
    });
  });

  // -------------------------------------------------------------------------
  describe('concurrency', () => {
    it('runs both queries concurrently (Promise.allSettled)', async () => {
      const inFlight = new Set<string>();
      let maxConcurrent = 0;

      const esClient = {
        esql: {
          query: jest.fn(async ({ query }: { query: string }) => {
            inFlight.add(query);
            maxConcurrent = Math.max(maxConcurrent, inFlight.size);
            await new Promise((resolve) => setTimeout(resolve, 10));
            inFlight.delete(query);
            return { columns: twoColumns, values: [['alice', 1]] };
          }),
        },
      } as unknown as ElasticsearchClient;

      const evaluator = createEsqlResultEquivalenceEvaluator({
        esClient,
        ...defaultExtractors,
      });

      await evaluator.evaluate(params(CANDIDATE_QUERY, GOLD_QUERY));

      expect(maxConcurrent).toBe(2);
    });
  });
});
