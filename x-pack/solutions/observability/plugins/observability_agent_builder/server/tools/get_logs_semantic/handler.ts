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

const UNAVAILABLE_WARNING =
  'Semantic log search is not available for this index. The cluster has no RERANK inference endpoint.';

const NO_PATTERNS_WARNING =
  'No matching log patterns in this time range. Widen the range and keep this tool; do not switch to observability.get_logs.';

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
  }>;
  /** Sum of the pattern counts, not a document count of the index. */
  totalCount: number;
  semanticQuery: string;
  strategy?: string;
  warnings: string[];
}

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

  if (!semanticLogSearch) {
    return {
      patterns: [],
      totalCount: 0,
      semanticQuery: semanticFilter,
      warnings: [UNAVAILABLE_WARNING],
    };
  }

  const result = await semanticLogSearch.search({
    esClient,
    target: index,
    nlQuery: semanticFilter,
    timeRange: { start: startMs, end: endMs },
    maxPatterns,
    kqlFilter,
  });

  if (result.unavailable) {
    return {
      patterns: [],
      totalCount: 0,
      semanticQuery: semanticFilter,
      warnings: [UNAVAILABLE_WARNING],
    };
  }

  const patterns = result.patterns.map(toPattern);
  const totalCount = patterns.reduce((sum, pattern) => sum + pattern.count, 0);

  return {
    patterns,
    totalCount,
    semanticQuery: semanticFilter,
    strategy: result.strategy,
    warnings: patterns.length === 0 ? [NO_PATTERNS_WARNING] : [],
  };
}

function truncateFieldValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_FIELD_VALUE_LENGTH) {
    return value.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
  }
  return value;
}

function toPattern(pattern: LogPattern): GetLogsSemanticResult['patterns'][number] {
  const { _id, _index, ...rest } = pattern.sample ?? {};
  return {
    pattern: pattern.pattern,
    count: pattern.count,
    firstSeen: pattern.firstSeen,
    lastSeen: pattern.lastSeen,
    sample: {
      ...(_id !== undefined ? { _id: _id as string } : {}),
      ...(_index !== undefined ? { _index: _index as string } : {}),
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [key, truncateFieldValue(value)])
      ),
    },
  };
}
