/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  FIND_THREAT_REPORTS_DEFAULT_PAGE_SIZE,
  FIND_THREAT_REPORTS_MAX_PAGE_SIZE,
  THREAT_REPORTS_INDEX_PATTERN,
  type FindThreatReportsQuery,
  type FindThreatReportsResponse,
  type ThreatReportSort,
  type ThreatReportSummary,
} from '../../../common/threat_intel';
import { truncate } from './report_content';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { buildSpaceFilterTerms } from '../lib/space_filter';
import { decodeCursor, encodeCursor } from '../lib/report_cursor';

const BODY_TEXT_SUMMARY_MAX = 280;
const IOC_SUMMARY_MAX = 25;

/**
 * OQ8b usable bar: title or body text, nested IOCs, severity.level, and revision.
 * `extracted.iocs` is nested, so exists on the parent path matches nothing.
 */
export const USABLE_REPORT_FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            { exists: { field: 'content.title' } },
            { exists: { field: 'content.body_text' } },
          ],
          minimum_should_match: 1,
        },
      },
      {
        nested: {
          path: 'extracted.iocs',
          query: {
            exists: { field: 'extracted.iocs.value' },
          },
        },
      },
      { exists: { field: 'severity.level' } },
      { exists: { field: 'revision' } },
    ],
  },
};

const toStringArray = (value: string | string[] | undefined): string[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

export const buildFindReportFilters = ({
  spaceId,
  source,
  severity,
  category,
  from,
  to,
  usableOnly,
}: {
  spaceId: string;
  source?: string;
  severity?: string | string[];
  category?: string | string[];
  from?: string;
  to?: string;
  usableOnly?: boolean;
}): estypes.QueryDslQueryContainer[] => {
  const filters: estypes.QueryDslQueryContainer[] = [buildSpaceFilterTerms(spaceId)];

  if (source) {
    filters.push({ term: { 'source.name': source } });
  }

  const severities = toStringArray(severity);
  if (severities.length > 0) {
    filters.push({ terms: { 'severity.level': severities } });
  }

  const categories = toStringArray(category);
  if (categories.length > 0) {
    filters.push({ terms: { 'extracted.categories': categories } });
  }

  if (from || to) {
    filters.push({
      range: {
        '@timestamp': {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
    });
  }

  if (usableOnly) {
    filters.push(USABLE_REPORT_FILTER);
  }

  return filters;
};

const buildSort = (sort: ThreatReportSort): estypes.Sort => {
  switch (sort) {
    case 'rank':
      return [{ rank_score: { order: 'desc', missing: '_last' } }, { _id: { order: 'asc' } }];
    case 'updated_at':
      return [
        { 'lineage.extracted_at': { order: 'desc', missing: '_last' } },
        { _id: { order: 'asc' } },
      ];
    case 'relevance':
    default:
      return [
        { 'extracted.relevance': { order: 'desc', missing: '_last' } },
        { _id: { order: 'asc' } },
      ];
  }
};

interface ReportSourceDoc {
  revision?: number;
  content?: {
    title?: string;
    body_text?: string;
  };
  severity?: {
    level?: string;
    score?: number;
  };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string }>;
    diamond?: {
      signal_count?: number;
      suitable?: boolean;
    };
  };
}

const mapHitToSummary = (hit: estypes.SearchHit<ReportSourceDoc>): ThreatReportSummary => {
  const source = hit._source ?? {};
  const title = source.content?.title;
  const bodyText = source.content?.body_text;
  const iocs = (source.extracted?.iocs ?? [])
    .filter(
      (ioc): ioc is { type: string; value: string } =>
        typeof ioc?.type === 'string' && typeof ioc?.value === 'string'
    )
    .slice(0, IOC_SUMMARY_MAX)
    .map((ioc) => ({ type: ioc.type, value: ioc.value }));

  const diamond = source.extracted?.diamond;
  const summary: ThreatReportSummary = {
    reportId: hit._id ?? '',
    revision: typeof source.revision === 'number' ? source.revision : 0,
    iocs,
  };

  if (typeof title === 'string' && title.length > 0) {
    summary.title = title;
  }
  if (typeof bodyText === 'string' && bodyText.length > 0) {
    summary.bodyText = truncate(bodyText, BODY_TEXT_SUMMARY_MAX);
  }
  if (source.severity?.level) {
    summary.severity = {
      level: source.severity.level,
      ...(typeof source.severity.score === 'number' ? { score: source.severity.score } : {}),
    };
  }
  if (
    diamond &&
    (typeof diamond.signal_count === 'number' || typeof diamond.suitable === 'boolean')
  ) {
    summary.diamond = {
      ...(typeof diamond.signal_count === 'number' ? { signalCount: diamond.signal_count } : {}),
      ...(typeof diamond.suitable === 'boolean' ? { suitable: diamond.suitable } : {}),
    };
  }

  return summary;
};

export interface FindThreatReportsParams extends FindThreatReportsQuery {
  spaceId: string;
}

export const findThreatReports = async (
  esClient: ElasticsearchClient,
  params: FindThreatReportsParams
): Promise<FindThreatReportsResponse> => {
  const {
    spaceId,
    cursor,
    pageSize: requestedPageSize,
    source,
    severity,
    category,
    from,
    to,
    usableOnly,
    sort = 'relevance',
  } = params;

  const pageSize = Math.min(
    requestedPageSize ?? FIND_THREAT_REPORTS_DEFAULT_PAGE_SIZE,
    FIND_THREAT_REPORTS_MAX_PAGE_SIZE
  );

  const filters = buildFindReportFilters({
    spaceId,
    source,
    severity,
    category,
    from,
    to,
    usableOnly,
  });

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: filters,
    },
  };

  const searchRequest: estypes.SearchRequest = {
    index: THREAT_REPORTS_INDEX_PATTERN,
    ...HIDDEN_INDEX_SEARCH_OPTIONS,
    size: pageSize + 1,
    track_total_hits: false,
    sort: buildSort(sort),
    query,
    _source: [
      'revision',
      'content.title',
      'content.body_text',
      'severity',
      'extracted.iocs.type',
      'extracted.iocs.value',
      'extracted.diamond.signal_count',
      'extracted.diamond.suitable',
    ],
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    searchRequest.search_after = decoded.sortValues;
  }

  const response = await esClient.search<ReportSourceDoc>(searchRequest);
  const hits = response.hits.hits ?? [];
  const hasMore = hits.length > pageSize;
  const pageHits = hasMore ? hits.slice(0, pageSize) : hits;
  const items = pageHits.map(mapHitToSummary);

  let nextCursor: string | null = null;
  if (hasMore && pageHits.length > 0) {
    const last = pageHits[pageHits.length - 1];
    const primary = last.sort?.[0];
    const id = last.sort?.[1];
    if (
      (typeof primary === 'string' || typeof primary === 'number' || primary == null) &&
      typeof id === 'string'
    ) {
      nextCursor = encodeCursor([primary ?? null, id]);
    }
  }

  return {
    items,
    nextCursor,
  };
};
