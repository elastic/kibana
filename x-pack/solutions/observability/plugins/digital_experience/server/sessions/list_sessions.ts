/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { CORE_WEB_VITALS } from '../../common/core_web_vitals';
import {
  SESSIONS_INDEX_PATTERN,
  emptyWebVitals,
  type FacetBucket,
  type SessionListFacets,
  type SessionListResponse,
  type SessionSortField,
  type SessionSummary,
  type SessionWebVitals,
} from '../../common/sessions';

/** Elasticsearch `index.max_result_window` default. */
const MAX_RESULT_WINDOW = 10_000;
const FACET_SIZE = 10;

export const SESSION_FACET_FIELDS = {
  browsers: 'user_agent.browser',
  os: 'user_agent.os',
  countries: 'geo.country_iso',
  entryPages: 'entry_page',
} as const satisfies Record<keyof SessionListFacets, string>;

type FacetName = keyof typeof SESSION_FACET_FIELDS;

const SEARCH_FIELDS = [
  'user.key',
  'journey',
  'user_agent.browser',
  'user_agent.os',
  'geo.country_iso',
  'geo.city',
] as const;

export interface ListSessionsParams {
  serviceName: string;
  start: string;
  end: string;
  query?: string;
  facets?: Partial<Record<FacetName, string>>;
  sortField: SessionSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface SessionDocument {
  session?: { id?: string };
  service?: { name?: string };
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  event_count?: number;
  page_view_count?: number;
  click_count?: number;
  error_count?: number;
  bounced?: boolean;
  entry_page?: string | null;
  exit_page?: string | null;
  journey?: string[] | string | null;
  user?: { key?: string | null };
  user_agent?: {
    browser?: string | null;
    browser_version?: string | null;
    os?: string | null;
    device?: string | null;
  };
  geo?: { country_iso?: string | null; region?: string | null; city?: string | null };
  web_vitals?: Partial<SessionWebVitals>;
}

const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

/** Sessions of `serviceName` that overlap the [start, end] range. */
export const sessionScopeFilters = ({
  serviceName,
  start,
  end,
}: Pick<ListSessionsParams, 'serviceName' | 'start' | 'end'>): QueryDslQueryContainer[] => [
  { term: { 'service.name': serviceName } },
  { range: { start_time: { lte: end } } },
  { range: { end_time: { gte: start } } },
];

const searchFilter = (query: string | undefined): QueryDslQueryContainer[] => {
  const term = query?.trim();
  if (!term) {
    return [];
  }
  const pattern = `*${escapeWildcard(term)}*`;
  return [
    {
      bool: {
        should: [
          { term: { 'session.id': term } },
          ...SEARCH_FIELDS.map((field) => ({
            wildcard: { [field]: { value: pattern, case_insensitive: true } },
          })),
        ],
        minimum_should_match: 1,
      },
    },
  ];
};

const facetFilters = (
  facets: ListSessionsParams['facets'] = {},
  exclude?: FacetName
): QueryDslQueryContainer[] =>
  (Object.keys(SESSION_FACET_FIELDS) as FacetName[])
    .filter((name) => name !== exclude && facets[name])
    .map((name) => ({ term: { [SESSION_FACET_FIELDS[name]]: facets[name] } }));

const allOf = (filters: QueryDslQueryContainer[]): QueryDslQueryContainer =>
  filters.length > 0 ? { bool: { filter: filters } } : { match_all: {} };

/** Set by the dest pipeline when it couldn't summarize a session; its counts are missing. */
const FAILED_SUMMARY: QueryDslQueryContainer = { exists: { field: 'error.message' } };

/** The listed sessions: selected facets, and only summaries the pipeline completed. */
const listedFilter = (facets: ListSessionsParams['facets'], exclude?: FacetName) => ({
  bool: { filter: facetFilters(facets, exclude), must_not: [FAILED_SUMMARY] },
});

export const buildListSessionsRequest = (params: ListSessionsParams): SearchRequest => {
  // Elasticsearch rejects `from + size` past the result window, so a later page is empty instead.
  const from = Math.min(params.page * params.perPage, MAX_RESULT_WINDOW);
  const size = Math.max(0, Math.min(params.perPage, MAX_RESULT_WINDOW - from));
  const facetAggs = Object.fromEntries(
    (Object.keys(SESSION_FACET_FIELDS) as FacetName[]).map((name) => [
      name,
      {
        // Each facet ignores its own selection so its other values stay selectable.
        filter: listedFilter(params.facets, name),
        aggs: { values: { terms: { field: SESSION_FACET_FIELDS[name], size: FACET_SIZE } } },
      },
    ])
  );
  const kpiAggs: Record<string, AggregationsAggregationContainer> = {
    median_duration: { percentiles: { field: 'duration_ms', percents: [50] } },
    avg_page_views: { avg: { field: 'page_view_count' } },
    // Bounce rate is over sessions with a page view; without one there was no page to leave.
    with_page_views: { filter: { range: { page_view_count: { gte: 1 } } } },
    bounced: { filter: { term: { bounced: true } } },
    with_errors: { filter: { term: { has_error: true } } },
    ...Object.fromEntries(
      CORE_WEB_VITALS.map((name) => [
        `vital_${name}`,
        { percentiles: { field: `web_vitals.${name}`, percents: [75] } },
      ])
    ),
  };

  return {
    index: SESSIONS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    from,
    size,
    sort: [{ [params.sortField]: params.sortDirection }, { 'session.id': 'asc' }],
    query: { bool: { filter: [...sessionScopeFilters(params), ...searchFilter(params.query)] } },
    post_filter: listedFilter(params.facets),
    aggs: {
      ...facetAggs,
      kpis: { filter: listedFilter(params.facets), aggs: kpiAggs },
      failed_summaries: {
        filter: allOf([...facetFilters(params.facets), FAILED_SUMMARY]),
      },
    },
  };
};

const numberOr = <T>(value: unknown, fallback: T): number | T =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const toSessionSummary = (doc: SessionDocument): SessionSummary => {
  const journey = Array.isArray(doc.journey) ? doc.journey : doc.journey ? [doc.journey] : [];
  const webVitals = emptyWebVitals();
  for (const name of CORE_WEB_VITALS) {
    webVitals[name] = numberOr(doc.web_vitals?.[name], null);
  }
  const pageViewCount = numberOr(doc.page_view_count, 0);
  return {
    sessionId: doc.session?.id ?? '',
    serviceName: doc.service?.name ?? '',
    startTime: doc.start_time ?? '',
    endTime: doc.end_time ?? '',
    durationMs: numberOr(doc.duration_ms, 0),
    eventCount: numberOr(doc.event_count, 0),
    pageViewCount,
    clickCount: numberOr(doc.click_count, 0),
    errorCount: numberOr(doc.error_count, 0),
    bounced: doc.bounced ?? pageViewCount === 1,
    entryPage: stringOrNull(doc.entry_page),
    exitPage: stringOrNull(doc.exit_page),
    journey,
    user: stringOrNull(doc.user?.key),
    userAgent: {
      browser: stringOrNull(doc.user_agent?.browser),
      browserVersion: stringOrNull(doc.user_agent?.browser_version),
      os: stringOrNull(doc.user_agent?.os),
      device: stringOrNull(doc.user_agent?.device),
    },
    geo: {
      countryIso: stringOrNull(doc.geo?.country_iso),
      region: stringOrNull(doc.geo?.region),
      city: stringOrNull(doc.geo?.city),
    },
    webVitals,
  };
};

interface TermsBucket {
  key: string | number;
  doc_count: number;
}

export interface ListSessionsAggs {
  kpis?: {
    doc_count: number;
    median_duration?: { values?: Record<string, number | null> };
    avg_page_views?: { value: number | null };
    with_page_views?: { doc_count: number };
    bounced?: { doc_count: number };
    with_errors?: { doc_count: number };
  } & Record<string, unknown>;
  failed_summaries?: { doc_count: number };
  [facet: string]: unknown;
}

const percentileOf = (agg: unknown, percent: string): number | null => {
  const values = (agg as { values?: Record<string, number | null> } | undefined)?.values;
  return numberOr(values?.[percent], null);
};

const facetBuckets = (agg: unknown): FacetBucket[] =>
  ((agg as { values?: { buckets?: TermsBucket[] } } | undefined)?.values?.buckets ?? []).map(
    (bucket) => ({ key: String(bucket.key), count: bucket.doc_count })
  );

export const parseListSessionsResponse = (
  response: SearchResponse<SessionDocument, ListSessionsAggs>,
  { page, perPage }: Pick<ListSessionsParams, 'page' | 'perPage'>
): SessionListResponse => {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const aggs = response.aggregations ?? {};
  const kpis = aggs.kpis;
  const totalSessions = kpis?.doc_count ?? 0;
  const sessionsWithPageViews = kpis?.with_page_views?.doc_count ?? 0;
  const webVitals = emptyWebVitals();
  for (const name of CORE_WEB_VITALS) {
    webVitals[name] = percentileOf(kpis?.[`vital_${name}`], '75.0');
  }

  return {
    // A summary without ids can't be opened; the transform skips empty ids, so this is defensive.
    sessions: response.hits.hits.flatMap(({ _source: doc }) =>
      doc?.session?.id && doc.service?.name ? [toSessionSummary(doc)] : []
    ),
    total,
    page,
    perPage,
    failedSummaries: aggs.failed_summaries?.doc_count ?? 0,
    facets: {
      browsers: facetBuckets(aggs.browsers),
      os: facetBuckets(aggs.os),
      countries: facetBuckets(aggs.countries),
      entryPages: facetBuckets(aggs.entryPages),
    },
    kpis: {
      totalSessions,
      medianDurationMs: percentileOf(kpis?.median_duration, '50.0'),
      avgPageViews: numberOr(kpis?.avg_page_views?.value, null),
      bounceRate:
        sessionsWithPageViews > 0 ? (kpis?.bounced?.doc_count ?? 0) / sessionsWithPageViews : null,
      sessionsWithErrors: kpis?.with_errors?.doc_count ?? 0,
      webVitals,
    },
  };
};

/** Queries the sessions index as the given (current) user. */
export const listSessions = async (
  client: ElasticsearchClient,
  params: ListSessionsParams
): Promise<SessionListResponse> => {
  const response = await client.search<SessionDocument, ListSessionsAggs>(
    buildListSessionsRequest(params)
  );
  return parseListSessionsResponse(response, params);
};
