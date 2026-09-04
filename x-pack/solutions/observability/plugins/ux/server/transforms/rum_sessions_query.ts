/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  applySessionIndexTrendSessions,
  type RumFiltersResponse,
  type RumTrendPoint,
  type SessionTrendAlign,
} from '../../common/rum_app';
import { eventSequenceToken, RUM_SESSIONS_INDEX } from '../../common/rum_sessions';
import { partitionFilterValues } from '../../common/rum_filters';
import {
  extraPathsForFind,
  mergeSessionFind,
  parseSessionFind,
  SESSION_INDEX_PAGE_FIELDS,
  sessionIndexFindFilters,
  wildcardContains,
} from '../../common/session_find';
import {
  FUNNEL_SESSION_SAMPLE_SIZE,
  type FunnelStepDef,
  type SessionFunnelResponse,
} from '../../common/session_funnel';
import type { SessionPatternsResponse } from '../../common/session_patterns';
import {
  bounceRate,
  sessionUserFromKey,
  SESSION_REPLAY_INDEX,
  type RumSessionSummary,
  type SessionListFacets,
  type SessionListResponse,
  type SessionListStats,
  type SessionSortField,
} from '../../common/session_replay';
import { fillSessionListSparklines } from './session_list_sparklines';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import { REPLAY_SESSION_ID_SCRIPT } from '../routes/session_replay/session_id_script';

export {
  mergeFunnelResponses,
  mergePatternResponses,
  mergeSessionListResponses,
} from '../../common/rum_sessions_merge';

const escapeWildcard = (raw: string): string => raw.replace(/[?*\\]/g, '\\$&');

const stepInterval = (step: FunnelStepDef) => ({
  wildcard: {
    pattern: `*${escapeWildcard(eventSequenceToken(step.type, step.value))}*`,
  },
});

const orderedPrefix = (steps: FunnelStepDef[]) => ({
  intervals: {
    event_sequence: {
      all_of: {
        ordered: true,
        intervals: steps.map(stepInterval),
      },
    },
  },
});

export const sessionIndexTimeFilter = (rangeFrom: string, rangeTo: string, watermark?: string) => {
  const lte = watermark && watermark < rangeTo ? watermark : rangeTo;
  return { range: { start_time: { gte: rangeFrom, lte } } };
};

const serviceFilter = (serviceName?: string) =>
  serviceName ? [{ term: { 'service.name': serviceName } }] : [];

const replayServiceFilter = (serviceName?: string) =>
  serviceName
    ? [
        {
          bool: {
            should: [
              { term: { 'resource.attributes.service.name': serviceName } },
              { term: { 'attributes.service.name': serviceName } },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];

/** Bound terms agg so dest list filters stay inside the ES terms clause limit. */
export const REPLAY_SESSION_ID_CAP = 10_000;

/** Session ids that have rrweb docs in the list time window. */
export const listReplaySessionIds = async ({
  client,
  rangeFrom,
  rangeTo,
  watermark,
  serviceName,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  watermark?: string | null;
  serviceName?: string;
}): Promise<string[]> => {
  const lte = watermark && watermark < rangeTo ? watermark : rangeTo;
  try {
    const result = await client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: rangeFrom, lte } } },
              ...replayServiceFilter(serviceName),
            ],
          },
        },
        aggs: {
          sessions: {
            terms: {
              script: { source: REPLAY_SESSION_ID_SCRIPT, lang: 'painless' },
              size: REPLAY_SESSION_ID_CAP,
              exclude: '',
            },
          },
        },
      },
      rumEsSearchOptions
    );
    const buckets =
      (result.aggregations as { sessions?: { buckets?: Array<{ key?: string | number }> } })
        ?.sessions?.buckets ?? [];
    return buckets.map((bucket) => String(bucket.key ?? '')).filter(Boolean);
  } catch {
    return [];
  }
};

const withReplaySessionIds = async (
  client: ElasticsearchClient,
  params: SessionIndexFilterParams
): Promise<SessionIndexFilterParams> => {
  if (params.replaySessionIds) {
    return params;
  }
  return {
    ...params,
    replaySessionIds: await listReplaySessionIds({
      client,
      rangeFrom: params.rangeFrom,
      rangeTo: params.rangeTo,
      watermark: params.watermark,
      serviceName: params.serviceName,
    }),
  };
};

const termMatch = (field: string, values: string[]): object | undefined => {
  if (values.length === 0) {
    return undefined;
  }
  if (values.length === 1) {
    return { term: { [field]: values[0] } };
  }
  return { terms: { [field]: values } };
};

const facetTerm = (field: string, raw?: string): object | undefined => {
  const { include, exclude } = partitionFilterValues(raw);
  const includeClause = termMatch(field, include);
  const excludeClause = termMatch(field, exclude);
  if (includeClause && excludeClause) {
    return { bool: { filter: [includeClause, { bool: { must_not: [excludeClause] } }] } };
  }
  if (includeClause) {
    return includeClause;
  }
  if (excludeClause) {
    return { bool: { must_not: [excludeClause] } };
  }
  return undefined;
};

const FRUSTRATION_CLAUSE = {
  error: { range: { error_count: { gt: 0 } } },
  rage: { range: { rage_click_count: { gt: 0 } } },
  dead: { range: { dead_click_count: { gt: 0 } } },
} as const;

/** Dest `bounced` is `page_view_count <= 1` and includes zero-page rows. Use exact one view. */
export const SESSION_INDEX_BOUNCED_FILTER = { term: { page_view_count: 1 } };
export const SESSION_INDEX_VIEWED_FILTER = { range: { page_view_count: { gte: 1 } } };

type SessionFrustrationKind = keyof typeof FRUSTRATION_CLAUSE;

const isFrustrationKind = (value: string): value is SessionFrustrationKind =>
  value === 'error' || value === 'rage' || value === 'dead';

export const querySessionIndexFunnel = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  steps,
  watermark,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  steps: FunnelStepDef[];
  watermark?: string;
}): Promise<SessionFunnelResponse> => {
  const filters = [
    sessionIndexTimeFilter(rangeFrom, rangeTo, watermark),
    ...serviceFilter(serviceName),
  ];
  const namedFilters = Object.fromEntries(
    steps.map((step, index) => [`step_${index}`, orderedPrefix(steps.slice(0, index + 1))])
  );

  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    track_total_hits: true,
    query: { bool: { filter: filters } },
    aggs: {
      steps: { filters: { filters: namedFilters } },
    },
  });

  const total =
    typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
  const buckets = (
    result.aggregations as {
      steps?: { buckets?: Record<string, { doc_count?: number }> };
    }
  )?.steps?.buckets;

  const counts = steps.map((_, index) => buckets?.[`step_${index}`]?.doc_count ?? 0);
  const startCount = counts[0] ?? 0;

  const droppedSamples = await Promise.all(
    steps.map(async (step, index) => {
      if (index === 0) {
        return [] as string[];
      }
      const dropped = await client.search({
        index: RUM_SESSIONS_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: FUNNEL_SESSION_SAMPLE_SIZE,
        _source: ['session.id'],
        query: {
          bool: {
            filter: [
              filters[0],
              ...serviceFilter(serviceName),
              orderedPrefix(steps.slice(0, index)),
            ],
            must_not: [orderedPrefix(steps.slice(0, index + 1))],
          },
        },
      });
      return dropped.hits.hits
        .map((hit) => {
          const source = hit._source as { session?: { id?: string } } | undefined;
          return source?.session?.id ?? hit._id ?? '';
        })
        .filter(Boolean);
    })
  );

  return {
    sessionsConsidered: total,
    steps: steps.map((step, index) => {
      const count = counts[index] ?? 0;
      const prevCount = index === 0 ? count : counts[index - 1] ?? 0;
      return {
        label: step.label?.trim() || step.value,
        type: step.type,
        value: step.value,
        count,
        conversionFromStart: startCount === 0 ? 0 : count / startCount,
        conversionFromPrevious: prevCount === 0 ? 0 : count / prevCount,
        dropOffCount: index === 0 ? 0 : Math.max(0, prevCount - count),
        sampleDroppedSessionIds: droppedSamples[index] ?? [],
      };
    }),
  };
};

const SORT_FIELD: Record<SessionSortField, string> = {
  startTime: 'start_time',
  durationMs: 'duration_ms',
  errorCount: 'error_count',
  actionCount: 'click_count',
  pageCount: 'page_count',
  rageClickCount: 'rage_click_count',
};

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toSummary = (source: Record<string, unknown>, id: string): RumSessionSummary => {
  const session = (source.session as Record<string, unknown> | undefined) ?? {};
  const user = (source.user as Record<string, unknown> | undefined) ?? {};
  const browser = (source.browser as Record<string, unknown> | undefined) ?? {};
  const os = (source.os as Record<string, unknown> | undefined) ?? {};
  const startTime = asString(source.start_time);
  const endTime = asString(source.end_time);
  const startMs = startTime ? Date.parse(startTime) : 0;
  const endMs = endTime ? Date.parse(endTime) : startMs;
  const pages = asStringArray(source.pages);
  const clicks = asStringArray(source.clicks);
  const userKey = asString(user.key);
  return {
    sessionId: asString(session.id) ?? id,
    startTime,
    endTime,
    eventCount: asNumber(source.event_count),
    errorCount: asNumber(source.error_count),
    actionCount: asNumber(source.click_count),
    rageClickCount: asNumber(source.rage_click_count),
    deadClickCount: asNumber(source.dead_click_count),
    errorGroups: asStringArray(source.error_groups),
    activeMs: asNumber(source.duration_ms) || Math.max(0, endMs - startMs),
    durationMs: asNumber(source.duration_ms) || Math.max(0, endMs - startMs),
    // page_view_count is the transform filter agg; page_count was entry+exit size until spec 8.
    pageCount: asNumber(source.page_view_count) || asNumber(source.page_count) || pages.length,
    entryPage: asString(source.entry_page),
    exitPage: asString(source.exit_page),
    pagePath: pages,
    activityPath: clicks,
    sparkline: [],
    user: sessionUserFromKey(userKey),
    client: {
      browser: asString(browser.name),
      os: asString(os.name),
      device: asString(source.device),
      mobile: null,
      country: asString(source.country_iso),
      countryIso: asString(source.country_iso),
      breakpoint: asString(browser.breakpoint),
      connection: asString(source.connection),
    },
    hasReplay: sourceHasReplay(source),
    replayEventCount: asNumber(source.replay_event_count),
  };
};

const sourceHasReplay = (source: Record<string, unknown>): boolean =>
  source.has_replay === true || asNumber(source.replay_event_count) > 0;

export const sessionIndexHasReplayQuery = (replaySessionIds?: string[]): object =>
  replaySessionIds && replaySessionIds.length > 0
    ? { terms: { 'session.id': replaySessionIds } }
    : { match_none: {} };

/** Hide dest rows with no page view, click, error, or replay documents. */
export const sessionIndexActivityFilter = (replaySessionIds?: string[]): object => {
  const should: object[] = [
    { range: { page_view_count: { gt: 0 } } },
    { range: { click_count: { gt: 0 } } },
    { range: { error_count: { gt: 0 } } },
  ];
  if (replaySessionIds && replaySessionIds.length > 0) {
    should.push({ terms: { 'session.id': replaySessionIds } });
  }
  return { bool: { should, minimum_should_match: 1 } };
};

const facetBuckets = (agg: unknown): Array<{ key: string; count: number }> => {
  const buckets = (agg as { buckets?: Array<{ key?: string; doc_count?: number }> } | undefined)
    ?.buckets;
  return (buckets ?? [])
    .map((bucket) => ({ key: String(bucket.key ?? ''), count: bucket.doc_count ?? 0 }))
    .filter((bucket) => bucket.key.length > 0);
};

export interface SessionIndexFilterParams {
  rangeFrom: string;
  rangeTo: string;
  watermark?: string | null;
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  user?: string;
  click?: string;
  account?: string;
  query?: string;
  sessionIds?: string;
  frustration?: string;
  breakpoint?: string;
  hasReplay?: string;
  hasErrors?: string;
  hasRage?: string;
  hasDead?: string;
  hasBounced?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  connection?: string;
  device?: string;
  errorGroup?: string;
  replaySessionIds?: string[];
}

export const sessionIndexParamsFromQuery = (
  query: {
    rangeFrom?: string;
    rangeTo?: string;
    serviceName?: string;
    browser?: string;
    os?: string;
    location?: string;
    pageUrl?: string;
    user?: string;
    frustration?: string;
    breakpoint?: string;
    connection?: string;
    device?: string;
    errorGroup?: string;
  },
  watermark?: string | null
): SessionIndexFilterParams => ({
  rangeFrom: query.rangeFrom || 'now-24h',
  rangeTo: query.rangeTo || 'now',
  watermark,
  serviceName: query.serviceName,
  browser: query.browser,
  os: query.os,
  location: query.location,
  pageUrl: query.pageUrl,
  user: query.user,
  frustration: query.frustration,
  breakpoint: query.breakpoint,
  connection: query.connection,
  device: query.device,
  errorGroup: query.errorGroup,
});

export const buildSessionIndexFilters = ({
  rangeFrom,
  rangeTo,
  watermark,
  serviceName,
  browser,
  os,
  location,
  pageUrl,
  user,
  click,
  account,
  query,
  sessionIds,
  frustration,
  breakpoint,
  hasReplay,
  hasErrors,
  hasRage,
  hasDead,
  hasBounced,
  minDurationMs,
  maxDurationMs,
  connection,
  device,
  errorGroup,
  replaySessionIds,
}: SessionIndexFilterParams): object[] => {
  const filters: object[] = [
    sessionIndexTimeFilter(rangeFrom, rangeTo, watermark ?? undefined),
    sessionIndexActivityFilter(replaySessionIds),
    ...serviceFilter(serviceName),
  ];
  const browserClause = facetTerm('browser.name', browser);
  if (browserClause) {
    filters.push(browserClause);
  }
  const osClause = facetTerm('os.name', os);
  if (osClause) {
    filters.push(osClause);
  }
  const locationClause = facetTerm('country_iso', location);
  if (locationClause) {
    filters.push(locationClause);
  }
  const breakpointClause = facetTerm('browser.breakpoint', breakpoint);
  if (breakpointClause) {
    filters.push(breakpointClause);
  }
  const { include: pageIncludes, exclude: pageExcludes } = partitionFilterValues(pageUrl);
  const find = mergeSessionFind(parseSessionFind(query), {
    path: pageIncludes.length === 1 ? pageIncludes[0] : undefined,
    click,
    user,
    account,
  });
  filters.push(
    ...sessionIndexFindFilters(
      find,
      extraPathsForFind(find, pageIncludes.length === 1 ? pageIncludes[0] : undefined)
    )
  );
  if (pageIncludes.length > 1) {
    filters.push({
      bool: {
        should: pageIncludes.map((path) => wildcardContains(SESSION_INDEX_PAGE_FIELDS, path)),
        minimum_should_match: 1,
      },
    });
  }
  if (pageExcludes.length > 0) {
    filters.push({
      bool: {
        must_not:
          pageExcludes.length === 1
            ? [wildcardContains(SESSION_INDEX_PAGE_FIELDS, pageExcludes[0])]
            : [
                {
                  bool: {
                    should: pageExcludes.map((path) =>
                      wildcardContains(SESSION_INDEX_PAGE_FIELDS, path)
                    ),
                    minimum_should_match: 1,
                  },
                },
              ],
      },
    });
  }
  if (sessionIds) {
    const ids = sessionIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (ids.length > 0) {
      filters.push({ terms: { 'session.id': ids } });
    }
  }
  if (hasReplay === 'true') {
    filters.push(sessionIndexHasReplayQuery(replaySessionIds));
  }
  if (hasErrors === 'true') {
    filters.push(FRUSTRATION_CLAUSE.error);
  }
  if (hasRage === 'true') {
    filters.push(FRUSTRATION_CLAUSE.rage);
  }
  if (hasDead === 'true') {
    filters.push(FRUSTRATION_CLAUSE.dead);
  }
  if (hasBounced === 'true') {
    filters.push(SESSION_INDEX_BOUNCED_FILTER);
  }
  const { include: frustrationInclude, exclude: frustrationExclude } =
    partitionFilterValues(frustration);
  const extraFrustration = frustrationInclude.filter(isFrustrationKind).filter((kind) => {
    if (kind === 'error') {
      return hasErrors !== 'true';
    }
    if (kind === 'rage') {
      return hasRage !== 'true';
    }
    return hasDead !== 'true';
  });
  if (extraFrustration.length === 1) {
    filters.push(FRUSTRATION_CLAUSE[extraFrustration[0]]);
  } else if (extraFrustration.length > 1) {
    filters.push({
      bool: {
        should: extraFrustration.map((kind) => FRUSTRATION_CLAUSE[kind]),
        minimum_should_match: 1,
      },
    });
  }
  const excludedFrustration = frustrationExclude.filter(isFrustrationKind);
  if (excludedFrustration.length === 1) {
    filters.push({ bool: { must_not: [FRUSTRATION_CLAUSE[excludedFrustration[0]]] } });
  } else if (excludedFrustration.length > 1) {
    filters.push({
      bool: {
        must_not: [
          {
            bool: {
              should: excludedFrustration.map((kind) => FRUSTRATION_CLAUSE[kind]),
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  }
  if (minDurationMs != null) {
    filters.push({ range: { duration_ms: { gte: minDurationMs } } });
  }
  if (maxDurationMs != null) {
    filters.push({ range: { duration_ms: { lte: maxDurationMs } } });
  }
  const connectionClause = facetTerm('connection', connection);
  if (connectionClause) {
    filters.push(connectionClause);
  }
  const deviceClause = facetTerm('device', device);
  if (deviceClause) {
    filters.push(deviceClause);
  }
  if (errorGroup) {
    filters.push({ term: { error_groups: errorGroup } });
  }
  return filters;
};

const sessionTrendMetricAggs = {
  page_views: { sum: { field: 'page_view_count' } },
  errors: { sum: { field: 'error_count' } },
};

export const sessionTrendsAggregation = (calendarInterval?: '1d') =>
  calendarInterval
    ? {
        date_histogram: { field: 'start_time', calendar_interval: calendarInterval },
        aggs: sessionTrendMetricAggs,
      }
    : {
        auto_date_histogram: { field: 'start_time', buckets: 24 },
        aggs: sessionTrendMetricAggs,
      };

export const trendsFromSessionHistogram = (agg: unknown): RumTrendPoint[] => {
  const buckets = (agg as { buckets?: Array<Record<string, unknown>> } | undefined)?.buckets ?? [];
  return buckets.map((bucket) => ({
    timestamp:
      typeof bucket.key_as_string === 'string'
        ? bucket.key_as_string
        : new Date(Number(bucket.key)).toISOString(),
    sessions: asNumber(bucket.doc_count),
    pageViews: asNumber((bucket.page_views as { value?: number } | undefined)?.value),
    errors: asNumber((bucket.errors as { value?: number } | undefined)?.value),
  }));
};

export const querySessionIndexTrends = async ({
  client,
  calendarInterval,
  ...params
}: SessionIndexFilterParams & {
  client: ElasticsearchClient;
  calendarInterval?: '1d';
}): Promise<RumTrendPoint[]> => {
  const withReplay = await withReplaySessionIds(client, params);
  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: { bool: { filter: buildSessionIndexFilters(withReplay) } },
    aggs: {
      trends: sessionTrendsAggregation(calendarInterval),
    },
  });
  return trendsFromSessionHistogram(
    (result.aggregations as { trends?: unknown } | undefined)?.trends
  );
};

export const overlaySessionTrendSessions = async ({
  client,
  trends,
  align,
  ...params
}: SessionIndexFilterParams & {
  client: ElasticsearchClient;
  trends: RumTrendPoint[];
  align: SessionTrendAlign;
}): Promise<RumTrendPoint[]> => {
  const sessionTrends = await querySessionIndexTrends({
    client,
    calendarInterval: align === '1d' ? '1d' : undefined,
    ...params,
  });
  return applySessionIndexTrendSessions(trends, sessionTrends);
};

export const querySessionIndexFilters = async ({
  client,
  ...params
}: SessionIndexFilterParams & { client: ElasticsearchClient }): Promise<RumFiltersResponse> => {
  const withReplay = await withReplaySessionIds(client, params);
  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: { bool: { filter: buildSessionIndexFilters(withReplay) } },
    aggs: {
      browsers: { terms: { field: 'browser.name', size: 20, exclude: '' } },
      os: { terms: { field: 'os.name', size: 20, exclude: '' } },
      pages: { terms: { field: 'pages', size: 30, exclude: '' } },
      breakpoints: { terms: { field: 'browser.breakpoint', size: 10, exclude: '' } },
      countries: { terms: { field: 'country_iso', size: 30, exclude: '' } },
      connections: { terms: { field: 'connection', size: 10, exclude: '' } },
      devices: { terms: { field: 'device', size: 10, exclude: '' } },
    },
  });
  const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
  return {
    browsers: facetBuckets(aggs.browsers),
    os: facetBuckets(aggs.os),
    pages: facetBuckets(aggs.pages),
    breakpoints: facetBuckets(aggs.breakpoints),
    connections: facetBuckets(aggs.connections),
    devices: facetBuckets(aggs.devices),
    countries: facetBuckets(aggs.countries),
  };
};

export const querySessionIndexKpis = async ({
  client,
  ...params
}: SessionIndexFilterParams & { client: ElasticsearchClient }): Promise<{
  sessions: number;
  pageViews: number;
  errorSessions: number;
  rageSessions: number;
  deadSessions: number;
  rageClicks: number;
  deadClicks: number;
  bouncedSessions: number;
  viewedSessions: number;
  bounceRate: number | null;
  trends: RumTrendPoint[];
}> => {
  const withReplay = await withReplaySessionIds(client, params);
  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    track_total_hits: true,
    query: { bool: { filter: buildSessionIndexFilters(withReplay) } },
    aggs: {
      page_views: { sum: { field: 'page_view_count' } },
      error_sessions: { filter: { range: { error_count: { gt: 0 } } } },
      rage_sessions: { filter: { range: { rage_click_count: { gt: 0 } } } },
      dead_sessions: { filter: { range: { dead_click_count: { gt: 0 } } } },
      rage_clicks: { sum: { field: 'rage_click_count' } },
      dead_clicks: { sum: { field: 'dead_click_count' } },
      bounced_sessions: { filter: SESSION_INDEX_BOUNCED_FILTER },
      viewed_sessions: { filter: SESSION_INDEX_VIEWED_FILTER },
      trends: sessionTrendsAggregation(),
    },
  });
  const total =
    typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
  const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
  const bouncedSessions =
    (aggs.bounced_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0;
  const viewedSessions =
    (aggs.viewed_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0;
  return {
    sessions: total,
    pageViews: asNumber((aggs.page_views as { value?: number } | undefined)?.value),
    errorSessions: (aggs.error_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0,
    rageSessions: (aggs.rage_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0,
    deadSessions: (aggs.dead_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0,
    rageClicks: asNumber((aggs.rage_clicks as { value?: number } | undefined)?.value),
    deadClicks: asNumber((aggs.dead_clicks as { value?: number } | undefined)?.value),
    bouncedSessions,
    viewedSessions,
    bounceRate: bounceRate(bouncedSessions, viewedSessions),
    trends: trendsFromSessionHistogram(aggs.trends),
  };
};

export const querySessionIndexSessions = async ({
  client,
  sortField,
  sortDirection,
  page,
  perPage,
  ...params
}: SessionIndexFilterParams & {
  client: ElasticsearchClient;
  sortField?: SessionSortField;
  sortDirection?: string;
  page: number;
  perPage: number;
}): Promise<SessionListResponse> => {
  const withReplay = await withReplaySessionIds(client, params);
  const filters = buildSessionIndexFilters(withReplay);
  const replaySessionIds = withReplay.replaySessionIds ?? [];
  const replayIdSet = new Set(replaySessionIds);

  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    from: page * perPage,
    size: perPage,
    track_total_hits: true,
    query: { bool: { filter: filters } },
    sort: [
      {
        [SORT_FIELD[sortField ?? 'startTime'] ?? 'start_time']:
          sortDirection === 'asc' ? 'asc' : 'desc',
      },
    ],
    aggs: {
      browsers: { terms: { field: 'browser.name', size: 12, exclude: '' } },
      os: { terms: { field: 'os.name', size: 12, exclude: '' } },
      countries: { terms: { field: 'country_iso', size: 12, exclude: '' } },
      users: { terms: { field: 'user.key', size: 12, exclude: '' } },
      has_replay: { filter: sessionIndexHasReplayQuery(replaySessionIds) },
      has_errors: { filter: { range: { error_count: { gt: 0 } } } },
      has_rage: { filter: { range: { rage_click_count: { gt: 0 } } } },
      has_bounced: { filter: SESSION_INDEX_BOUNCED_FILTER },
      viewed_sessions: { filter: SESSION_INDEX_VIEWED_FILTER },
      rage_clicks: { sum: { field: 'rage_click_count' } },
      duration_percentiles: { percentiles: { field: 'duration_ms', percents: [50] } },
    },
  });

  const total =
    typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
  const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
  const sessions = (
    await fillSessionListSparklines(
      client,
      result.hits.hits.map((hit) =>
        toSummary((hit._source as Record<string, unknown>) ?? {}, String(hit._id))
      )
    )
  ).map((session) => ({
    ...session,
    hasReplay: replayIdSet.has(session.sessionId),
  }));
  const facets: SessionListFacets = {
    browsers: facetBuckets(aggs.browsers),
    os: facetBuckets(aggs.os),
    countries: facetBuckets(aggs.countries),
    users: facetBuckets(aggs.users),
    hasReplay: (aggs.has_replay as { doc_count?: number } | undefined)?.doc_count ?? 0,
    hasErrors: (aggs.has_errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
    hasRage: (aggs.has_rage as { doc_count?: number } | undefined)?.doc_count ?? 0,
    hasBounced: (aggs.has_bounced as { doc_count?: number } | undefined)?.doc_count ?? 0,
  };
  const median =
    (aggs.duration_percentiles as { values?: Record<string, number> } | undefined)?.values?.[
      '50.0'
    ] ?? 0;
  const stats: SessionListStats = {
    total,
    withReplay: facets.hasReplay,
    withErrors: facets.hasErrors,
    rageClicks: asNumber((aggs.rage_clicks as { value?: number } | undefined)?.value),
    medianDurationMs: Number.isFinite(median) ? Math.round(median) : 0,
    bounced: facets.hasBounced,
    viewed: (aggs.viewed_sessions as { doc_count?: number } | undefined)?.doc_count ?? 0,
  };
  return { sessions, total, facets, stats };
};

export const querySessionIndexPatterns = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  watermark,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  watermark?: string;
}): Promise<SessionPatternsResponse> => {
  const result = await client.search({
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          sessionIndexTimeFilter(rangeFrom, rangeTo, watermark),
          ...serviceFilter(serviceName),
        ],
      },
    },
    aggs: {
      journeys: {
        terms: { field: 'path_key', size: 10, exclude: '' },
        aggs: {
          errors: { filter: { range: { error_count: { gt: 0 } } } },
          rage: { filter: { range: { rage_click_count: { gt: 0 } } } },
          samples: { terms: { field: 'session.id', size: 8 } },
        },
      },
      activities: {
        terms: { field: 'click_path_key', size: 10, exclude: '' },
        aggs: {
          errors: { filter: { range: { error_count: { gt: 0 } } } },
          rage: { filter: { range: { rage_click_count: { gt: 0 } } } },
          samples: { terms: { field: 'session.id', size: 8 } },
        },
      },
      exits: { terms: { field: 'exit_page', size: 10, exclude: '' } },
      friction_errors: {
        filter: { range: { error_count: { gt: 0 } } },
        aggs: { by_page: { terms: { field: 'exit_page', size: 8, exclude: '' } } },
      },
      friction_rage: {
        filter: { range: { rage_click_count: { gt: 0 } } },
        aggs: { by_page: { terms: { field: 'exit_page', size: 8, exclude: '' } } },
      },
    },
  });

  const total =
    typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
  const aggs = (result.aggregations ?? {}) as {
    journeys?: PathTermsAgg;
    activities?: PathTermsAgg;
    exits?: { buckets?: Array<{ key?: string; doc_count?: number }> };
    friction_errors?: { by_page?: { buckets?: Array<{ key?: string; doc_count?: number }> } };
    friction_rage?: { by_page?: { buckets?: Array<{ key?: string; doc_count?: number }> } };
  };

  return {
    sessionsConsidered: total,
    journeys: pathPatternsFromTerms(aggs.journeys, 'page', total),
    activities: pathPatternsFromTerms(aggs.activities, 'activity', total),
    exits: facetBuckets(aggs.exits).map((bucket) => ({
      kind: 'page' as const,
      step: bucket.key,
      sessionCount: bucket.count,
      share: total === 0 ? 0 : bucket.count / total,
      sampleSessionIds: [],
    })),
    friction: [
      ...facetBuckets(aggs.friction_errors?.by_page).map((bucket) => ({
        kind: 'errors' as const,
        step: bucket.key,
        sessionCount: bucket.count,
        share: total === 0 ? 0 : bucket.count / total,
        sampleSessionIds: [],
      })),
      ...facetBuckets(aggs.friction_rage?.by_page).map((bucket) => ({
        kind: 'rage' as const,
        step: bucket.key,
        sessionCount: bucket.count,
        share: total === 0 ? 0 : bucket.count / total,
        sampleSessionIds: [],
      })),
    ]
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 8),
  };
};

interface PathTermsAgg {
  buckets?: Array<{
    key?: string;
    doc_count?: number;
    errors?: { doc_count?: number };
    rage?: { doc_count?: number };
    samples?: { buckets?: Array<{ key?: string }> };
  }>;
}

const pathPatternsFromTerms = (
  agg: PathTermsAgg | undefined,
  kind: 'page' | 'activity',
  total: number
) =>
  (agg?.buckets ?? [])
    .map((bucket) => ({
      kind,
      steps: String(bucket.key ?? '')
        .split('>')
        .filter(Boolean),
      sessionCount: bucket.doc_count ?? 0,
      share: total === 0 ? 0 : (bucket.doc_count ?? 0) / total,
      errorSessionCount: bucket.errors?.doc_count ?? 0,
      rageSessionCount: bucket.rage?.doc_count ?? 0,
      sampleSessionIds: (bucket.samples?.buckets ?? [])
        .map((item) => String(item.key ?? ''))
        .filter(Boolean),
    }))
    .filter((row) => row.steps.length > 0);
