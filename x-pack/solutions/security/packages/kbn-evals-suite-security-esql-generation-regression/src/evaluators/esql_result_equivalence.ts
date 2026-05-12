/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Evaluator, EvaluationResult, Example, TaskOutput } from '@kbn/evals';

export const ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME = 'ES|QL Result Equivalence';

/**
 * ES|QL query result as returned by `esClient.esql.query`.
 */
interface EsqlQueryResult {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
}

/**
 * Options that control how rows are normalised before comparison.
 *
 * Normalisation happens independently on both result sets, so two queries
 * whose raw outputs differ only in row order (or float precision) will still
 * produce a Jaccard score of 1.
 */
export interface NormalizeOptions {
  /**
   * Sort serialized rows lexicographically before comparison.
   * Defaults to `true`. Set to `false` only when row order is semantically
   * significant (e.g. TOP-N queries where rank matters).
   */
  sortRows?: boolean;
  /**
   * Column names to exclude from row comparison.
   * Useful for ignoring non-deterministic fields such as timestamps, UUIDs,
   * or score fields that the gold query cannot predict.
   */
  ignoreFields?: string[];
  /**
   * Number of decimal places to round numeric values to before comparison.
   * Use when gold and candidate may produce slightly different floating-point
   * results due to aggregation order or precision differences.
   * Example: `floatTolerance: 2` rounds `1.005123` to `1.01`.
   */
  floatTolerance?: number;
}

/**
 * Serialise a single row value, applying float rounding when configured.
 */
function serializeValue(value: unknown, floatTolerance?: number): unknown {
  if (typeof value === 'number' && floatTolerance !== undefined) {
    return parseFloat(value.toFixed(floatTolerance));
  }
  return value;
}

/**
 * Convert an ES|QL result set into an array of serialised row strings,
 * applying the given normalisation options.
 *
 * Each string is the JSON serialisation of one row's (filtered, rounded)
 * values. The returned array is optionally sorted so that row order does
 * not affect the Jaccard calculation.
 */
function normalizeRows(
  columns: Array<{ name: string; type: string }>,
  values: unknown[][],
  options: NormalizeOptions
): string[] {
  const { sortRows = true, ignoreFields = [], floatTolerance } = options;

  const keepIndices = columns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => !ignoreFields.includes(col.name))
    .map(({ idx }) => idx);

  const serialized = values.map((row) => {
    const kept = keepIndices.map((idx) => serializeValue(row[idx], floatTolerance));
    return JSON.stringify(kept);
  });

  return sortRows ? serialized.sort() : serialized;
}

/**
 * Compute Jaccard similarity over two multisets of serialised rows.
 *
 * Jaccard = |intersection| / |union|
 *
 * Multiset intersection: for each unique row, count min(gold, candidate).
 * Multiset union: total_gold + total_candidate - intersection.
 *
 * Returns 1 when both sets are empty (vacuously equivalent).
 */
function jaccardMultiset(goldRows: string[], candidateRows: string[]): number {
  if (goldRows.length === 0 && candidateRows.length === 0) {
    return 1;
  }

  const goldCounts = new Map<string, number>();
  const candidateCounts = new Map<string, number>();

  for (const row of goldRows) {
    goldCounts.set(row, (goldCounts.get(row) ?? 0) + 1);
  }
  for (const row of candidateRows) {
    candidateCounts.set(row, (candidateCounts.get(row) ?? 0) + 1);
  }

  let intersectionSize = 0;
  for (const [row, goldCount] of goldCounts) {
    const candidateCount = candidateCounts.get(row) ?? 0;
    intersectionSize += Math.min(goldCount, candidateCount);
  }

  const unionSize = goldRows.length + candidateRows.length - intersectionSize;
  return unionSize === 0 ? 1 : intersectionSize / unionSize;
}

function labelFromScore(score: number): string {
  if (score === 1) return 'exact-match';
  if (score === 0) return 'no-overlap';
  return 'partial-match';
}

/**
 * Deterministic evaluator that compares ES|QL result sets using Jaccard
 * similarity (CODE-kind, no LLM call).
 *
 * Both the gold query (from `expected`) and the candidate query (from
 * `output`) are executed concurrently against the live cluster via
 * `esClient.esql.query`. Their result rows are normalised and compared.
 * The final score is the Jaccard index of the two normalised row multisets.
 *
 * If either query fails to execute, the evaluator returns
 * `scoreOnExecutionFailure` (default 0) immediately — without rows to
 * compare, no meaningful similarity signal can be produced.
 *
 * ### Normalisation options
 *
 * `normalize.sortRows` (default `true`): ignore row order.
 * `normalize.ignoreFields`: exclude non-deterministic columns (timestamps,
 *   UUIDs) from comparison.
 * `normalize.floatTolerance`: round numerics to N decimal places before
 *   comparison, handling aggregation precision drift.
 *
 * @param config.esClient - Elasticsearch client used to run both queries.
 * @param config.predictionExtractor - Extracts the candidate ES|QL query
 *   string from the task output.
 * @param config.groundTruthExtractor - Extracts the gold ES|QL query string
 *   from the example's expected value.
 * @param config.normalize - Normalisation options applied to both result sets
 *   before comparison.
 * @param config.scoreOnExecutionFailure - Score returned when either query
 *   fails to execute. Defaults to `0`.
 * @param config.name - Override the evaluator name (defaults to
 *   `ES|QL Result Equivalence`).
 */
export function createEsqlResultEquivalenceEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  esClient: ElasticsearchClient;
  predictionExtractor: (output: TTaskOutput) => string;
  groundTruthExtractor: (expected: TExample['output']) => string;
  normalize?: NormalizeOptions;
  scoreOnExecutionFailure?: number;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    esClient,
    predictionExtractor,
    groundTruthExtractor,
    normalize = {},
    scoreOnExecutionFailure = 0,
    name = ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let candidateQuery: string;
      let goldQuery: string;

      try {
        candidateQuery = predictionExtractor(output);
      } catch (err) {
        return {
          score: scoreOnExecutionFailure,
          label: 'error',
          explanation: `Prediction extractor threw: ${(err as Error).message}`,
        };
      }

      try {
        goldQuery = groundTruthExtractor(expected);
      } catch (err) {
        return {
          score: scoreOnExecutionFailure,
          label: 'error',
          explanation: `Ground truth extractor threw: ${(err as Error).message}`,
        };
      }

      if (!candidateQuery || !goldQuery) {
        return {
          score: scoreOnExecutionFailure,
          label: 'error',
          explanation: `Missing ${
            !candidateQuery ? 'candidate' : 'gold'
          } query — cannot compare result sets.`,
        };
      }

      const [goldResult, candidateResult] = await Promise.allSettled([
        esClient.esql.query({ query: goldQuery }) as Promise<EsqlQueryResult>,
        esClient.esql.query({ query: candidateQuery }) as Promise<EsqlQueryResult>,
      ]);

      if (goldResult.status === 'rejected') {
        const msg =
          goldResult.reason instanceof Error
            ? goldResult.reason.message
            : String(goldResult.reason);
        return {
          score: scoreOnExecutionFailure,
          label: 'execution-failure',
          explanation: `Gold query failed to execute: ${msg}`,
          metadata: { goldQuery, candidateQuery, goldError: msg },
        };
      }

      if (candidateResult.status === 'rejected') {
        const msg =
          candidateResult.reason instanceof Error
            ? candidateResult.reason.message
            : String(candidateResult.reason);
        return {
          score: scoreOnExecutionFailure,
          label: 'execution-failure',
          explanation: `Candidate query failed to execute: ${msg}`,
          metadata: { goldQuery, candidateQuery, candidateError: msg },
        };
      }

      const gold = goldResult.value;
      const candidate = candidateResult.value;

      const goldColumns = gold.columns ?? [];
      const candidateColumns = candidate.columns ?? [];
      const goldValues = gold.values ?? [];
      const candidateValues = candidate.values ?? [];

      const goldRows = normalizeRows(goldColumns, goldValues, normalize);
      const candidateRows = normalizeRows(candidateColumns, candidateValues, normalize);

      const goldRowCount = goldRows.length;
      const candidateRowCount = candidateRows.length;

      const goldCounts = new Map<string, number>();
      for (const row of goldRows) {
        goldCounts.set(row, (goldCounts.get(row) ?? 0) + 1);
      }
      const candidateCounts = new Map<string, number>();
      for (const row of candidateRows) {
        candidateCounts.set(row, (candidateCounts.get(row) ?? 0) + 1);
      }
      let intersectionRowCount = 0;
      for (const [row, gc] of goldCounts) {
        intersectionRowCount += Math.min(gc, candidateCounts.get(row) ?? 0);
      }

      const jaccard = jaccardMultiset(goldRows, candidateRows);

      const explanation =
        jaccard === 1
          ? `Result sets are identical: ${goldRowCount} row${
              goldRowCount === 1 ? '' : 's'
            } match exactly.`
          : jaccard === 0
          ? `Result sets have no overlap (gold: ${goldRowCount} row${
              goldRowCount === 1 ? '' : 's'
            }, candidate: ${candidateRowCount} row${candidateRowCount === 1 ? '' : 's'}).`
          : `Partial match: ${intersectionRowCount} of ${Math.max(
              goldRowCount,
              candidateRowCount
            )} rows overlap (Jaccard=${jaccard.toFixed(
              3
            )}, gold=${goldRowCount}, candidate=${candidateRowCount}).`;

      return {
        score: jaccard,
        label: labelFromScore(jaccard),
        explanation,
        metadata: {
          goldRowCount,
          candidateRowCount,
          intersectionRowCount,
          jaccard,
          goldQuery,
          candidateQuery,
        },
      };
    },
  };
}
