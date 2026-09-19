/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogPattern, SemanticLogSearchService } from '@kbn/logs-data-access-plugin/server';
import { parseDatemath } from '../../utils/time';

const MAX_FIELD_VALUE_LENGTH = 500;
const MAX_SAMPLE_ARRAY_ITEMS = 20;
const MAX_SAMPLE_OBJECT_FIELDS = 50;
const MAX_SAMPLE_DEPTH = 3;

const WARNINGS = {
  missingFields:
    'Semantic log search is unavailable because the target does not expose the required message and @timestamp fields. Do not retry with the same target.',
  inferenceUnavailable:
    'Semantic log search is unavailable because the cluster has no RERANK inference endpoint. Do not retry.',
  timeout:
    'Semantic log search timed out. Narrow the time range or add a KQL filter before retrying once.',
  cancelled: 'Semantic log search was cancelled. Do not retry automatically.',
  execution:
    'Semantic log search failed during execution. Do not retry automatically or fall back silently.',
  serviceUnavailable: 'Semantic log search is not registered. Do not retry.',
  missingTarget: 'No log indices are available to search. Do not retry with this tool.',
  noPatterns:
    'No log patterns were found in this time range. You may retry once with a different time range or KQL scope.',
} as const;

interface GetLogsSemanticParams {
  start: string;
  end: string;
  index: string;
  semanticFilter: string;
  kqlFilter?: string;
  maxPatterns: number;
}

export interface GetLogsSemanticResult {
  patterns: Array<{
    pattern: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    sample: { _id?: string; _index?: string; [key: string]: unknown };
    relevanceScore?: number;
  }>;
  /** Sum of the pattern counts, not a document count of the index. */
  totalCount: number;
  semanticQuery: string;
  warnings: string[];
}

const emptyResult = (semanticQuery: string, warning: string): GetLogsSemanticResult => ({
  patterns: [],
  totalCount: 0,
  semanticQuery,
  warnings: [warning],
});

export async function getLogsSemanticHandler({
  esClient,
  params,
  semanticLogSearch,
}: {
  esClient: ElasticsearchClient;
  params: GetLogsSemanticParams;
  semanticLogSearch?: SemanticLogSearchService;
}): Promise<GetLogsSemanticResult> {
  const { start, end, index, semanticFilter, kqlFilter, maxPatterns } = params;

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });
  if (!startMs || !endMs) {
    throw new Error(`Invalid date range: start="${start}", end="${end}"`);
  }

  if (index.trim().length === 0) {
    return emptyResult(semanticFilter, WARNINGS.missingTarget);
  }

  if (!semanticLogSearch) {
    return emptyResult(semanticFilter, WARNINGS.serviceUnavailable);
  }

  const result = await semanticLogSearch.search({
    esClient,
    target: index,
    nlQuery: semanticFilter,
    timeRange: { start: startMs, end: endMs },
    maxPatterns,
    kqlFilter,
  });

  if (result.status === 'unavailable') {
    const warning =
      result.reason === 'missing_fields' ? WARNINGS.missingFields : WARNINGS.inferenceUnavailable;
    return emptyResult(semanticFilter, warning);
  }

  if (result.status === 'error') {
    const warning =
      result.reason === 'timeout'
        ? WARNINGS.timeout
        : result.reason === 'cancelled'
        ? WARNINGS.cancelled
        : WARNINGS.execution;
    return emptyResult(semanticFilter, warning);
  }

  const patterns = result.patterns.map(toPattern);
  const totalCount = patterns.reduce((sum, pattern) => sum + pattern.count, 0);

  return {
    patterns,
    totalCount,
    semanticQuery: semanticFilter,
    warnings: patterns.length === 0 ? [WARNINGS.noPatterns] : [],
  };
}

function sanitizeSampleValue(value: unknown, depth: number = 0): unknown {
  if (typeof value === 'string' && value.length > MAX_FIELD_VALUE_LENGTH) {
    return value.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_SAMPLE_DEPTH) {
    return '[truncated]';
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_SAMPLE_ARRAY_ITEMS)
      .map((item) => sanitizeSampleValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_SAMPLE_OBJECT_FIELDS)
      .map(([key, nestedValue]) => [key, sanitizeSampleValue(nestedValue, depth + 1)])
  );
}

function toPattern(pattern: LogPattern): GetLogsSemanticResult['patterns'][number] {
  const { _id, _index, ...rest } = pattern.sample ?? {};
  return {
    pattern: pattern.pattern,
    count: pattern.count,
    firstSeen: pattern.firstSeen,
    lastSeen: pattern.lastSeen,
    sample: {
      ...(typeof _id === 'string' ? { _id } : {}),
      ...(typeof _index === 'string' ? { _index } : {}),
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [key, sanitizeSampleValue(value)])
      ),
    },
    ...(pattern.relevanceScore !== undefined ? { relevanceScore: pattern.relevanceScore } : {}),
  };
}
