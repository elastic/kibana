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
  type DetectionActionability,
  type ReportSortBy,
  type SeverityLevel,
  type SourceType,
  type ThreatCategory,
  type ThreatRegion,
} from '../../../common/threat_intelligence/hub';

/**
 * Domain capability module for the `find_threat_reports` action.
 *
 * Per the Agent Builder architecture guidance, business logic for every
 * domain action lives in a shared service that the internal HTTP route,
 * the Agent Builder tool wrapper, and any future ECLI / workflow consumer
 * all delegate to. The route is the canonical execution surface; the tool
 * is a thin portability wrapper.
 */

export interface FindThreatReportsParams {
  /**
   * Free-text discovery query. Empty / omitted enables browse mode (filter +
   * sort only), used by the Intelligence Hub Threat reports feed.
   */
  query?: string;
  size?: number;
  /** Result offset for pagination (Hub feed). */
  from?: number;
  source_types?: SourceType[];
  min_severity?: SeverityLevel;
  /**
   * Exact severity multi-select (Hub chip filters). Prefer this over
   * `min_severity` when the caller wants specific levels, not a floor.
   */
  severities?: SeverityLevel[];
  time_range?: { from: string; to: string };
  categories?: ThreatCategory[];
  regions?: ThreatRegion[];
  /**
   * Closed-set classifier filter — see `DETECTION_ACTIONABILITY_LEVELS`
   * in `common/threat_intelligence/hub/constants.ts`. Allows operators
   * to scope to `rule_candidate` reports (or any subset of the
   * `informational | iocs_only | ttps_present | rule_candidate`
   * enum) without thresholding the float `extracted.relevance` field.
   * Backs the dashboard's "Actionable" chip and the "rule_candidate
   * only" digest preset.
   */
  detection_actionability?: DetectionActionability[];
  /**
   * Sort mode.
   *
   *   - `undefined` (the default) and `'relevance'` use the hybrid RRF
   *     retriever (semantic + BM25) — best for free-text discovery
   *     ("ransomware in EMEA financial services?").
   *   - `'rank'`     sorts by the tradecraft-style `rank_score` field
   *     (`severity.score * extracted.relevance`) — best for "give me
   *     the most actionable reports right now" digest / top-N flows.
   *   - `'severity'` sorts by the single-dimension `severity.score` —
   *     legacy compatibility.
   *   - `'recency'`  sorts by `@timestamp` descending — useful when the
   *     caller already filtered to a tight window and wants chronology.
   *
   * In every mode except `'relevance'` (RRF), the free-text `query`
   * is still applied as a `multi_match` filter so the result set is
   * scoped to documents that mention the query terms — only the
   * ordering changes. When `query` is empty, field-sorted modes use
   * `match_all` (browse / Hub pagination).
   */
  sort_by?: ReportSortBy;
}

export interface FindThreatReportsResult {
  total: number;
  /**
   * Echo of the effective sort mode so callers can render an
   * unambiguous "Sorted by: rank score" label without reasoning about
   * `undefined` vs `'relevance'`.
   */
  sort_by: ReportSortBy;
  reports: Array<Record<string, unknown> & { report_id?: string; score?: number | null }>;
}

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const buildSeverityFilter = ({
  minSeverity,
  severities,
}: {
  minSeverity?: SeverityLevel;
  severities?: SeverityLevel[];
}): Array<Record<string, unknown>> => {
  if (severities?.length) {
    return [{ terms: { 'severity.level': severities } }];
  }
  if (!minSeverity) return [];
  const allowed = SEVERITY_LEVELS.filter(
    (level) => SEVERITY_RANK[level] >= SEVERITY_RANK[minSeverity]
  );
  return [{ terms: { 'severity.level': allowed } }];
};

// Plain `string[]` (not `readonly`) so the ES client's mutable
// `SearchSourceConfig` overload accepts it without a cast at every call site.
const SOURCE_FIELDS: string[] = [
  '@timestamp',
  'source',
  'content.title',
  'content.body_text',
  'severity',
  'rank_score',
  'corroborated_rank_score',
  'extracted.ttps.techniques',
  'extracted.threat_actors',
  'extracted.categories',
  'extracted.relevance',
  'extracted.detection_actionability',
  'geography.regions',
  'content_fingerprint',
  'feedback',
  'attribution.environment_hits_total',
];

const truncateBodyText = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > 1200 ? `${trimmed.slice(0, 1200).trimEnd()}…` : trimmed;
};

/**
 * Lexical-only query targets for the BM25 retriever branch and for field-sorted
 * (`rank` / `severity` / `recency`) modes. Must stay on `text` siblings — never
 * `content.title` / `content.body_text` (`semantic_text` rejects match queries).
 * Adapters populate these mirrors at ingest; `backfillBm25MirrorFields` repairs
 * legacy rows missing them.
 */
const BM25_QUERY_FIELDS = ['content.title_bm25^2', 'content.body_text_bm25'] as const;

/**
 * Translate a `sort_by` mode into an Elasticsearch `sort` clause.
 *
 * `'rank'` is a tiered sort that prefers the hunt-feedback-corroborated
 * derivative, falling back through the static rank and severity score:
 *
 *   1. `corroborated_rank_score` — `rank_score * (1 + boost)` where
 *      `boost ∈ [0, 0.5]` reflects how many environment matches the
 *      latest orchestrator hunt produced (see
 *      `services/write_hunt_feedback.ts`).
 *   2. `rank_score`               — static `severity.score * relevance`
 *      composite written at extraction time. Reports never hunted yet
 *      (typical for fresh ingestions) fall through to this tier.
 *   3. `severity.score`           — single-dimension fallback for
 *      pre-v8 reports that pre-date the rank composite.
 *
 * Every tier carries `missing: 0` so reports lacking a given field sort
 * below ranked reports rather than sorting unpredictably or being
 * dropped from the result set. `'severity'` and `'recency'` are
 * single-tier sorts for backward compat.
 */
const buildSortClause = (
  sortBy: Exclude<ReportSortBy, 'relevance'>
): Array<Record<string, unknown>> => {
  switch (sortBy) {
    case 'rank':
      return [
        { corroborated_rank_score: { order: 'desc', missing: 0 } },
        { rank_score: { order: 'desc', missing: 0 } },
        { 'severity.score': { order: 'desc', missing: 0 } },
      ];
    case 'severity':
      return [{ 'severity.score': { order: 'desc', missing: 0 } }];
    case 'recency':
      return [{ '@timestamp': { order: 'desc' } }];
  }
};

export const findThreatReports = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  spaceId: string,
  params: FindThreatReportsParams
): Promise<FindThreatReportsResult> => {
  const {
    query: rawQuery,
    size = 10,
    from = 0,
    source_types: sourceTypes,
    min_severity: minSeverity,
    severities,
    time_range: timeRange,
    categories,
    regions,
    detection_actionability: detectionActionability,
    sort_by: sortBy,
  } = params;

  const query = rawQuery?.trim() ?? '';
  const hasQuery = query.length > 0;

  const filters: Array<Record<string, unknown>> = [
    { terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } },
  ];
  if (sourceTypes?.length) filters.push({ terms: { 'source.type': sourceTypes } });
  if (timeRange) {
    filters.push({ range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } });
  }
  if (categories?.length) filters.push({ terms: { 'extracted.categories': categories } });
  if (regions?.length) filters.push({ terms: { 'geography.regions': regions } });
  if (detectionActionability?.length) {
    filters.push({ terms: { 'extracted.detection_actionability': detectionActionability } });
  }
  filters.push(...buildSeverityFilter({ minSeverity, severities }));

  const sharedFilter = filters.length ? { bool: { filter: filters } } : undefined;
  // Browse mode (no query) cannot use RRF; fall back to recency unless the
  // caller already picked a field sort. Explicit `'relevance'` with a query
  // still uses the hybrid retriever.
  const effectiveSort: ReportSortBy = !hasQuery
    ? sortBy && sortBy !== 'relevance'
      ? sortBy
      : 'recency'
    : sortBy ?? 'relevance';

  const mapHits = (
    hits: Array<{ _id?: string; _score?: number | null; _source?: unknown }>
  ) =>
    hits.map((hit) => {
      const source = (hit._source ?? {}) as Record<string, unknown>;
      const content = (source.content as Record<string, unknown> | undefined) ?? {};
      const bodyText = truncateBodyText(content.body_text);
      return {
        report_id: hit._id,
        score: hit._score,
        ...source,
        content: {
          ...content,
          ...(bodyText ? { body_text: bodyText } : { body_text: undefined }),
        },
      };
    });

  if (effectiveSort === 'relevance' && hasQuery) {
    // RRF retriever combines a BM25 multi_match against the mirror fields with a
    // semantic retriever against the semantic_text fields. RRF degrades gracefully
    // if inference is unavailable — BM25 hits still surface.
    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      size,
      from,
      track_total_hits: true,
      _source: SOURCE_FIELDS,
      retriever: {
        rrf: {
          rank_window_size: Math.max((from + size) * 4, 50),
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
                          fields: [...BM25_QUERY_FIELDS],
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

    const hits = mapHits(response.hits.hits ?? []);

    logger.debug(
      `find_threat_reports returned ${hits.length} hits for query="${query}" ` +
        `in space="${spaceId}" sort_by="relevance" from=${from}`
    );

    return {
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? hits.length,
      sort_by: effectiveSort,
      reports: hits,
    };
  }

  // Field-sorted mode. With a free-text query, BM25 must-match scopes the
  // set; with an empty query (Hub browse), match_all + filters only.
  const response = await esClient.search({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size,
    from,
    track_total_hits: true,
    _source: SOURCE_FIELDS,
    sort: buildSortClause(effectiveSort as Exclude<ReportSortBy, 'relevance'>),
    query: {
      bool: {
        ...(hasQuery
          ? {
              must: [
                {
                  multi_match: {
                    query,
                    fields: [...BM25_QUERY_FIELDS],
                  },
                },
              ],
            }
          : {}),
        ...(sharedFilter ? { filter: sharedFilter.bool.filter } : {}),
      },
    },
  } as Parameters<typeof esClient.search>[0]);

  const hits = mapHits(response.hits.hits ?? []);

  logger.debug(
    `find_threat_reports returned ${hits.length} hits for query="${query || '*'}" ` +
      `in space="${spaceId}" sort_by="${effectiveSort}" from=${from}`
  );

  return {
    total:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? hits.length,
    sort_by: effectiveSort,
    reports: hits,
  };
};
