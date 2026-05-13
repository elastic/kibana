/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  GLOBAL_SPACE_ID,
  SEVERITY_LEVELS,
  THREAT_REPORTS_INDEX_PATTERN,
  type SeverityLevel,
  type SourceType,
  type ThreatCategory,
  type ThreatRegion,
} from '../../common';

/**
 * Domain capability module for the `search_reports` action.
 *
 * Per the Agent Builder architecture guidance, business logic for every
 * domain action lives in a shared service that the internal HTTP route,
 * the Agent Builder tool wrapper, and any future ECLI / workflow consumer
 * all delegate to. The route is the canonical execution surface; the tool
 * is a thin portability wrapper.
 */

export interface SearchReportsParams {
  query: string;
  size?: number;
  source_types?: SourceType[];
  min_severity?: SeverityLevel;
  time_range?: { from: string; to: string };
  categories?: ThreatCategory[];
  regions?: ThreatRegion[];
}

export interface SearchReportsResult {
  total: number;
  reports: Array<Record<string, unknown> & { report_id?: string; score?: number | null }>;
}

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const buildSeverityFilter = (minSeverity?: SeverityLevel): Array<Record<string, unknown>> => {
  if (!minSeverity) return [];
  const allowed = SEVERITY_LEVELS.filter(
    (level) => SEVERITY_RANK[level] >= SEVERITY_RANK[minSeverity]
  );
  return [{ terms: { 'severity.level': allowed } }];
};

export const searchReports = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  spaceId: string,
  params: SearchReportsParams
): Promise<SearchReportsResult> => {
  const {
    query,
    size = 10,
    source_types: sourceTypes,
    min_severity: minSeverity,
    time_range: timeRange,
    categories,
    regions,
  } = params;

  const filters: Array<Record<string, unknown>> = [
    { terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } },
  ];
  if (sourceTypes?.length) filters.push({ terms: { 'source.type': sourceTypes } });
  if (timeRange) {
    filters.push({ range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } });
  }
  if (categories?.length) filters.push({ terms: { 'extracted.categories': categories } });
  if (regions?.length) filters.push({ terms: { 'geography.regions': regions } });
  filters.push(...buildSeverityFilter(minSeverity));

  const sharedFilter = filters.length ? { bool: { filter: filters } } : undefined;

  // RRF retriever combines a BM25 multi_match against the mirror fields with a
  // semantic retriever against the semantic_text fields. RRF degrades gracefully
  // if inference is unavailable — BM25 hits still surface.
  const response = await esClient.search({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size,
    _source: [
      '@timestamp',
      'source',
      'content.title',
      'severity',
      'extracted.ttps.techniques',
      'extracted.threat_actors',
      'extracted.categories',
      'geography.regions',
      'content_fingerprint',
    ],
    retriever: {
      rrf: {
        rank_window_size: Math.max(size * 4, 50),
        rank_constant: 60,
        retrievers: [
          {
            standard: {
              query: {
                bool: {
                  must: [
                    {
                      multi_match: {
                        query,
                        fields: ['content.title_bm25^2', 'content.body_text_bm25'],
                      },
                    },
                  ],
                  ...(sharedFilter ? { filter: sharedFilter.bool.filter } : {}),
                },
              },
            },
          },
          {
            standard: {
              query: {
                bool: {
                  should: [
                    { semantic: { field: 'content.title', query } },
                    { semantic: { field: 'content.body_text', query } },
                  ],
                  minimum_should_match: 1,
                  ...(sharedFilter ? { filter: sharedFilter.bool.filter } : {}),
                },
              },
            },
          },
        ],
      },
    },
  } as Parameters<typeof esClient.search>[0]);

  const hits = (response.hits.hits ?? []).map((hit) => ({
    report_id: hit._id,
    score: hit._score,
    ...(hit._source as Record<string, unknown>),
  }));

  logger.debug(
    `search_reports returned ${hits.length} hits for query="${query}" in space="${spaceId}"`
  );

  return {
    total:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? hits.length,
    reports: hits,
  };
};
