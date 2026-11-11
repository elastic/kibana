/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { CORE_WEB_VITALS, type CoreWebVital } from '../../../common/core_web_vitals';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_LOOKBACK_DAYS,
  emptyWebVitals,
  type SessionListFacets,
  type SessionListResponse,
  type SessionSortField,
  type SessionSummary,
} from '../../../common/sessions';
import {
  bucketCounts,
  getPercentile,
  p75Of,
  percentileOf,
  type CountedTermsAggregation,
  type PercentilesAggregation,
} from '../../lib/helpers/aggregations';
import { environmentFilter } from '../../lib/helpers/environment';
import { numberOr, stringOrNull, totalHitsOf } from '../../lib/helpers/values';
import type { SessionDocument } from '../../services/sessions/sessions_index';

/** Elasticsearch `index.max_result_window` default. */
const MAX_RESULT_WINDOW = 10_000;
const FACET_SIZE = 10;
const ENVIRONMENT_FIELD = 'environment';

export const SESSION_FACET_FIELDS = {
  browsers: 'user_agent.browser',
  os: 'user_agent.os',
  countries: 'geo.country_iso',
  entryPages: 'entry_page',
} as const satisfies Record<keyof SessionListFacets, string>;

type FacetName = keyof typeof SESSION_FACET_FIELDS;

/** Narrow the list and every count; unlike facets, they have no values to pick from. */
export interface SessionListFilters {
  withJsErrors?: boolean;
  withFailedRequests?: boolean;
  /** Inclusive lower bound of the session duration. */
  minDurationMs?: number;
  /** Exclusive upper bound of the session duration. */
  maxDurationMs?: number;
}

export interface ListSessionsParams {
  serviceName: string;
  start: string;
  end: string;
  /** All environments when left out. */
  environment?: string;
  query?: string;
  facets?: Partial<Record<FacetName, string>>;
  filters?: SessionListFilters;
  sortField: SessionSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  perPage: number;
}

/** A summary as read back; written by the summaries task, so missing fields are defensive. */
export type StoredSessionDocument = Partial<SessionDocument>;

const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

/** Sessions that overlap the [start, end] range. */
export const sessionOverlapFilters = ({
  start,
  end,
}: Pick<ListSessionsParams, 'start' | 'end'>): QueryDslQueryContainer[] => [
  { range: { start_time: { lte: end } } },
  { range: { end_time: { gte: start } } },
];

/** Sessions of `serviceName` and the environment that overlap the [start, end] range. */
export const sessionScopeFilters = ({
  serviceName,
  start,
  end,
  environment,
}: Pick<
  ListSessionsParams,
  'serviceName' | 'start' | 'end' | 'environment'
>): QueryDslQueryContainer[] => [
  { term: { 'service.name': serviceName } },
  ...sessionOverlapFilters({ start, end }),
  environmentFilter([ENVIRONMENT_FIELD], environment),
];

/** Sessions with the search term anywhere in their id, user, user agent, geo or pages. */
const searchFilter = (query: string | undefined): QueryDslQueryContainer[] => {
  const term = query?.trim().toLowerCase();
  return term ? [{ wildcard: { search: { value: `*${escapeWildcard(term)}*` } } }] : [];
};

const facetFilters = (
  facets: ListSessionsParams['facets'] = {},
  exclude?: FacetName
): QueryDslQueryContainer[] =>
  (Object.keys(SESSION_FACET_FIELDS) as FacetName[])
    .filter((name) => name !== exclude && facets[name])
    .map((name) => ({ term: { [SESSION_FACET_FIELDS[name]]: facets[name] } }));

const atLeastOne = (field: string): QueryDslQueryContainer => ({ range: { [field]: { gte: 1 } } });
const WITH_JS_ERRORS = atLeastOne('js_error_count');
const WITH_FAILED_REQUESTS = atLeastOne('http_failed_request_count');

const sessionFilters = ({
  withJsErrors,
  withFailedRequests,
  minDurationMs,
  maxDurationMs,
}: SessionListFilters = {}): QueryDslQueryContainer[] => [
  ...(withJsErrors ? [WITH_JS_ERRORS] : []),
  ...(withFailedRequests ? [WITH_FAILED_REQUESTS] : []),
  ...(minDurationMs !== undefined || maxDurationMs !== undefined
    ? [
        {
          range: {
            duration_ms: {
              ...(minDurationMs !== undefined ? { gte: minDurationMs } : {}),
              ...(maxDurationMs !== undefined ? { lt: maxDurationMs } : {}),
            },
          },
        },
      ]
    : []),
];

/** The listed sessions: selected filters and facets. */
const listedFilter = (
  { facets, filters }: Pick<ListSessionsParams, 'facets' | 'filters'>,
  exclude?: FacetName
): QueryDslQueryContainer => ({
  bool: { filter: [...sessionFilters(filters), ...facetFilters(facets, exclude)] },
});

const vitalAggregationName = (vital: CoreWebVital) => `vital_${vital}` as const;

export const buildListSessionsRequest = (params: ListSessionsParams): SearchRequest => {
  // Elasticsearch rejects `from + size` past the result window, so a later page is empty instead.
  const from = Math.min(params.page * params.perPage, MAX_RESULT_WINDOW);
  const size = Math.max(0, Math.min(params.perPage, MAX_RESULT_WINDOW - from));
  const facetAggs = Object.fromEntries(
    (Object.keys(SESSION_FACET_FIELDS) as FacetName[]).map((name) => [
      name,
      {
        // Each facet ignores its own selection so its other values stay selectable.
        filter: listedFilter(params, name),
        aggs: { values: { terms: { field: SESSION_FACET_FIELDS[name], size: FACET_SIZE } } },
      },
    ])
  );

  return {
    index: SESSIONS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    from,
    size,
    sort: [{ [params.sortField]: params.sortDirection }, { 'session.id': 'asc' }],
    query: { bool: { filter: [...sessionScopeFilters(params), ...searchFilter(params.query)] } },
    post_filter: listedFilter(params),
    aggs: {
      ...facetAggs,
      kpis: {
        filter: listedFilter(params),
        aggs: {
          median_duration: percentileOf('duration_ms', 50),
          avg_page_views: { avg: { field: 'page_view_count' } },
          // Bounce rate is over sessions with a page view; without one there was no page to leave.
          with_page_views: { filter: atLeastOne('page_view_count') },
          bounced: { filter: { term: { bounced: true } } },
          with_js_errors: { filter: WITH_JS_ERRORS },
          with_failed_requests: { filter: WITH_FAILED_REQUESTS },
          ...Object.fromEntries(
            CORE_WEB_VITALS.map((vital) => [
              vitalAggregationName(vital),
              p75Of(`web_vitals.${vital}`),
            ])
          ),
        },
      },
    },
  };
};

export const toSessionSummary = (doc: StoredSessionDocument): SessionSummary => {
  const webVitals = emptyWebVitals();
  for (const vital of CORE_WEB_VITALS) {
    webVitals[vital] = numberOr(doc.web_vitals?.[vital], null);
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
    pageLoadCount: numberOr(doc.page_load_count, 0),
    clickCount: numberOr(doc.click_count, 0),
    jsErrorCount: numberOr(doc.js_error_count, 0),
    httpRequestCount: numberOr(doc.http_request_count, 0),
    failedRequestCount: numberOr(doc.http_failed_request_count, 0),
    bounced: doc.bounced ?? pageViewCount === 1,
    entryPage: stringOrNull(doc.entry_page),
    exitPage: stringOrNull(doc.exit_page),
    journey: Array.isArray(doc.journey) ? doc.journey : [],
    environment: stringOrNull(doc.environment),
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

interface FacetAggregation {
  values: CountedTermsAggregation;
}

interface DocCount {
  doc_count: number;
}

export type ListSessionsAggs = Record<FacetName, FacetAggregation> & {
  kpis: DocCount & {
    median_duration: PercentilesAggregation;
    avg_page_views: { value: number | null };
    with_page_views: DocCount;
    bounced: DocCount;
    with_js_errors: DocCount;
    with_failed_requests: DocCount;
  } & Record<ReturnType<typeof vitalAggregationName>, PercentilesAggregation>;
};

export const parseListSessionsResponse = (
  response: SearchResponse<StoredSessionDocument, ListSessionsAggs>,
  { page, perPage }: Pick<ListSessionsParams, 'page' | 'perPage'>
): SessionListResponse => {
  const aggs = response.aggregations;
  const kpis = aggs?.kpis;
  const sessionsWithPageViews = kpis?.with_page_views.doc_count ?? 0;
  const webVitals = emptyWebVitals();
  for (const vital of CORE_WEB_VITALS) {
    const aggregation = kpis?.[vitalAggregationName(vital)];
    webVitals[vital] = aggregation ? getPercentile(aggregation) : null;
  }

  return {
    // A summary without ids can't be opened; the task skips empty ids, so this is defensive.
    sessions: response.hits.hits.flatMap(({ _source: doc }) =>
      doc?.session?.id && doc.service?.name ? [toSessionSummary(doc)] : []
    ),
    total: totalHitsOf(response.hits.total),
    page,
    perPage,
    retentionDays: SESSIONS_LOOKBACK_DAYS,
    facets: {
      browsers: bucketCounts(aggs?.browsers.values),
      os: bucketCounts(aggs?.os.values),
      countries: bucketCounts(aggs?.countries.values),
      entryPages: bucketCounts(aggs?.entryPages.values),
    },
    kpis: {
      totalSessions: kpis?.doc_count ?? 0,
      medianDurationMs: kpis ? getPercentile(kpis.median_duration) : null,
      avgPageViews: numberOr(kpis?.avg_page_views.value, null),
      bounceRate:
        sessionsWithPageViews > 0 ? (kpis?.bounced.doc_count ?? 0) / sessionsWithPageViews : null,
      sessionsWithJsErrors: kpis?.with_js_errors.doc_count ?? 0,
      sessionsWithFailedRequests: kpis?.with_failed_requests.doc_count ?? 0,
      webVitals,
    },
  };
};

/** Queries the sessions index as the given (current) user. */
export const listSessions = async (
  client: ElasticsearchClient,
  params: ListSessionsParams
): Promise<SessionListResponse> => {
  const response = await client.search<StoredSessionDocument, ListSessionsAggs>(
    buildListSessionsRequest(params)
  );
  return parseListSessionsResponse(response, params);
};
