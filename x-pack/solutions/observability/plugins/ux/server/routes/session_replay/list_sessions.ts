/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { resolveRumAnalytics } from '../../transforms/rum_sessions';
import { resolveNewTailSessionIds } from '../../transforms/rum_sessions_tail';
import {
  mergeSessionListResponses,
  querySessionIndexSessions,
} from '../../transforms/rum_sessions_query';
import {
  isHeartbeatOnlySession,
  isBouncedSession,
  sessionBounceCounts,
  RUM_SESSION_SOURCE_INDEX,
  SESSION_REPLAY_INDEX,
  type RumSessionSummary,
  type SessionListFacets,
  type SessionListResponse,
  type SessionListStats,
  type SessionSortField,
} from '../../../common/session_replay';
import { CLICK_FILTER, EXCEPTION_FILTER } from '../../transforms/rum_sessions_spec';
import {
  buildSparkline,
  clientFromHits,
  collectSessionSignals,
  computeActiveMs,
  countDeadAndErrorClicks,
  dedupeConsecutive,
  pagePathFromAnyHits,
  userFromHits,
  type OtelHit,
} from './session_attributes';
import { boundedString, rumListQueryCodec } from '../rum/query';
import { kueryFilters } from '../rum/kuery';
import { botExclusionFilters } from '../rum/bots';
import { rumEsSearchOptions } from '../rum/es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import { SESSION_ID_SCRIPT } from './session_id_script';
import {
  extraPathsForFind,
  FIND_USER_FIELDS,
  intersectSessionIds,
  mergeSessionFind,
  parseSessionFind,
  sessionFindClauses,
  sessionIdTermsFilter,
} from '../../../common/session_find';

export { SESSION_ID_SCRIPT };

interface SessionBucket {
  key: string;
  doc_count: number;
  start_time?: { value_as_string?: string; value?: number | null };
  end_time?: { value_as_string?: string; value?: number | null };
  error_count?: { doc_count: number };
  click_count?: { doc_count: number };
  sample?: { hits?: { hits?: OtelHit[] } };
  identified?: { sample?: { hits?: { hits?: OtelHit[] } } };
}

const toIso = (agg?: { value_as_string?: string; value?: number | null }): string | null => {
  if (!agg) {
    return null;
  }
  if (agg.value_as_string) {
    return agg.value_as_string;
  }
  if (typeof agg.value === 'number') {
    return new Date(agg.value).toISOString();
  }
  return null;
};

export const SAMPLE_SOURCE = [
  'name',
  'event_name',
  '@timestamp',
  'attributes',
  'resource.attributes',
];

interface SessionDerived {
  entryPage: string | null;
  exitPage: string | null;
  pagePath: string[];
  pageCount: number;
  activityPath: string[];
  rageClickCount: number;
  deadClickCount: number;
  errorGroups: string[];
  activeMs: number;
  sparkline: RumSessionSummary['sparkline'];
  user: RumSessionSummary['user'];
  client: RumSessionSummary['client'];
}

const deriveFromSample = (
  hits: OtelHit[],
  startMs: number,
  endMs: number,
  identifiedHits: OtelHit[] = []
): SessionDerived => {
  const { pages, activities, clicks, timestamps, errorGroups } = collectSessionSignals(hits);
  const viewPath = dedupeConsecutive(pages).slice(0, 12);
  const pagePath = viewPath.length > 0 ? viewPath : pagePathFromAnyHits(hits);
  const activityPath = dedupeConsecutive(activities).slice(0, 10);
  const { dead, rage } = countDeadAndErrorClicks(hits, clicks);
  const userHits = identifiedHits.length > 0 ? [...identifiedHits, ...hits] : hits;

  return {
    entryPage: pagePath[0] ?? null,
    exitPage: pagePath.length > 0 ? pagePath[pagePath.length - 1]! : null,
    pagePath,
    pageCount: viewPath.length,
    activityPath,
    rageClickCount: rage,
    deadClickCount: dead,
    errorGroups: errorGroups.slice(0, 8),
    activeMs: computeActiveMs(timestamps),
    sparkline: buildSparkline(hits, startMs, endMs),
    user: userFromHits(userHits),
    client: clientFromHits(userHits),
  };
};

const REPLAY_SESSION_ID_SCRIPT = `
  def rum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  def sid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  return '';
`;

export const listSessionReplaySessionsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/sessions',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.intersection([
      rumListQueryCodec,
      t.partial({
        query: boundedString(512),
        sortField: boundedString(32),
        sortDirection: boundedString(8),
        page: boundedString(8),
        perPage: boundedString(8),
        hasReplay: boundedString(8),
        hasErrors: boundedString(8),
        hasRage: boundedString(8),
        hasDead: boundedString(8),
        hasBounced: boundedString(8),
        minDurationMs: boundedString(16),
        maxDurationMs: boundedString(16),
        click: boundedString(512),
        account: boundedString(256),
        includeRaw: boundedString(8),
      }),
    ]),
  }),
  handler: async ({ context, core, params, request }): Promise<SessionListResponse> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const rangeTo = params.query.rangeTo || 'now';
    const analytics = await resolveRumAnalytics(elasticsearch.client.asInternalUser, {
      analyticsMode: params.query.analyticsMode,
      rangeTo,
    });
    const perPage = Math.min(Math.max(Number(params.query.perPage) || 25, 1), 100);
    const page = Math.max(Number(params.query.page) || 0, 0);

    if (analytics.useIndex) {
      const settled = await querySessionIndexSessions({
        client,
        rangeFrom: params.query.rangeFrom || 'now-24h',
        rangeTo,
        serviceName: params.query.serviceName,
        watermark: analytics.status.watermark ?? undefined,
        sortField: params.query.sortField as SessionSortField | undefined,
        sortDirection: params.query.sortDirection,
        page,
        perPage,
        browser: params.query.browser,
        os: params.query.os,
        location: params.query.location,
        pageUrl: params.query.pageUrl,
        user: params.query.user,
        click: params.query.click,
        account: params.query.account,
        query: params.query.query,
        sessionIds: params.query.sessionIds,
        frustration: params.query.frustration,
        hasReplay: params.query.hasReplay,
        hasErrors: params.query.hasErrors,
        hasRage: params.query.hasRage,
        hasDead: params.query.hasDead,
        hasBounced: params.query.hasBounced,
        minDurationMs: params.query.minDurationMs ? Number(params.query.minDurationMs) : undefined,
        maxDurationMs: params.query.maxDurationMs ? Number(params.query.maxDurationMs) : undefined,
      });
      if (!analytics.mergeRaw || !analytics.status.watermark || page > 0) {
        return settled;
      }
      const newIds = await resolveNewTailSessionIds({
        client,
        rangeFrom: analytics.status.watermark,
        rangeTo,
        serviceName: params.query.serviceName,
        kuery: params.query.kuery,
      });
      if (newIds.length === 0) {
        return settled;
      }
      const live = await queryRawSessions(
        client,
        {
          ...params.query,
          rangeFrom: analytics.status.watermark,
          rangeTo,
          page: '0',
          perPage: String(perPage),
        },
        newIds
      );
      return mergeSessionListResponses(settled, live, perPage);
    }

    return queryRawSessions(client, params.query);
  },
});

const queryRawSessions = async (
  client: ElasticsearchClient,
  query: Record<string, string | undefined>,
  restrictToSessionIds?: string[]
): Promise<SessionListResponse> => {
  const params = { query };
  const { rangeFrom = 'now-24h', rangeTo = 'now', serviceName, kuery } = params.query;
  if (restrictToSessionIds && restrictToSessionIds.length === 0) {
    return {
      sessions: [],
      total: 0,
      facets: computeFacets([]),
      stats: computeStats([]),
    };
  }
  // Server-side sort/paginate/search operate over a bounded candidate window derived
  // from the terms aggregation. Sufficient for the POC; true scale needs a composite agg.
  const candidateSize = 200;

  const timeFilter = { range: { '@timestamp': { gte: rangeFrom, lte: rangeTo } } };
  const serviceFilters = serviceName
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
  const filters = [
    timeFilter,
    ...serviceFilters,
    ...botExclusionFilters(params.query.includeBots, params.query.botUa),
    ...kueryFilters(kuery),
  ];
  if (params.query.breakpoint) {
    filters.push({ term: { 'attributes.browser.breakpoint': params.query.breakpoint } });
  }
  if (params.query.connection) {
    filters.push({ term: { 'attributes.network.connection.type': params.query.connection } });
  }
  if (params.query.device) {
    filters.push({
      bool: {
        should: [
          { term: { 'attributes.device.memory': params.query.device } },
          { term: { 'resource.attributes.device.memory': params.query.device } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  if (params.query.location) {
    filters.push({
      bool: {
        should: [
          { term: { 'client.geo.country_iso_code': params.query.location } },
          { term: { 'resource.attributes.client.geo.country_iso_code': params.query.location } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  if (restrictToSessionIds && restrictToSessionIds.length > 0) {
    filters.push(sessionIdTermsFilter(restrictToSessionIds));
  }

  const find = mergeSessionFind(parseSessionFind(params.query.query), {
    path: params.query.pageUrl,
    click: params.query.click,
    user: params.query.user,
    account: params.query.account,
  });
  const findClauses = sessionFindClauses(find, extraPathsForFind(find, params.query.pageUrl));
  if (findClauses.length > 0) {
    const idSets = await Promise.all(
      findClauses.map(async (clause) => {
        const result = await client.search(
          {
            index: RUM_SESSION_SOURCE_INDEX,
            ignore_unavailable: true,
            allow_no_indices: true,
            size: 0,
            query: { bool: { filter: [...filters, ...clause] } },
            aggs: {
              sessions: {
                terms: {
                  script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
                  size: candidateSize,
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
      })
    );
    const matchingIds = intersectSessionIds(idSets);
    if (matchingIds.length === 0) {
      return {
        sessions: [],
        total: 0,
        facets: computeFacets([]),
        stats: computeStats([]),
      };
    }
    filters.push(sessionIdTermsFilter(matchingIds));
  }

  const [rumResult, replayResult] = await Promise.all([
    client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: filters } },
        aggs: {
          sessions: {
            terms: {
              script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
              size: candidateSize,
              order: { start_time: 'desc' },
            },
            aggs: {
              start_time: { min: { field: '@timestamp' } },
              end_time: { max: { field: '@timestamp' } },
              error_count: { filter: EXCEPTION_FILTER },
              click_count: { filter: CLICK_FILTER },
              sample: {
                top_hits: {
                  size: 100,
                  sort: [{ '@timestamp': 'asc' as const }],
                  _source: SAMPLE_SOURCE,
                },
              },
              identified: {
                filter: {
                  bool: {
                    should: FIND_USER_FIELDS.map((field) => ({ exists: { field } })),
                    minimum_should_match: 1,
                  },
                },
                aggs: {
                  sample: {
                    top_hits: {
                      size: 5,
                      sort: [{ '@timestamp': 'desc' as const }],
                      _source: SAMPLE_SOURCE,
                    },
                  },
                },
              },
            },
          },
        },
      },
      rumEsSearchOptions
    ),
    client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: filters } },
        aggs: {
          sessions: {
            terms: {
              script: { source: REPLAY_SESSION_ID_SCRIPT, lang: 'painless' },
              size: candidateSize,
              order: { start_time: 'desc' },
            },
            aggs: {
              start_time: { min: { field: '@timestamp' } },
              end_time: { max: { field: '@timestamp' } },
              sample: {
                top_hits: {
                  size: 20,
                  sort: [{ '@timestamp': 'asc' as const }],
                  _source: SAMPLE_SOURCE,
                },
              },
            },
          },
        },
      },
      rumEsSearchOptions
    ),
  ]);

  const rumBuckets =
    (rumResult.aggregations as { sessions?: { buckets?: SessionBucket[] } })?.sessions?.buckets ??
    [];
  const replayBuckets =
    (replayResult.aggregations as { sessions?: { buckets?: SessionBucket[] } })?.sessions
      ?.buckets ?? [];

  const replayById = new Map(
    replayBuckets
      .filter((bucket) => Boolean(bucket.key))
      .map((bucket) => {
        const startTime = toIso(bucket.start_time);
        const endTime = toIso(bucket.end_time);
        const startMs = startTime ? Date.parse(startTime) : 0;
        const endMs = endTime ? Date.parse(endTime) : startMs + 1;
        const derived = deriveFromSample(
          bucket.sample?.hits?.hits ?? [],
          startMs,
          endMs,
          bucket.identified?.sample?.hits?.hits ?? []
        );
        return [
          String(bucket.key),
          { eventCount: bucket.doc_count, startTime, endTime, derived },
        ] as const;
      })
  );

  const sessionsById = new Map<string, RumSessionSummary>();

  for (const bucket of rumBuckets) {
    if (!bucket.key) {
      continue;
    }
    const sessionId = String(bucket.key);
    const replay = replayById.get(sessionId);
    const startTime = toIso(bucket.start_time);
    const endTime = toIso(bucket.end_time);
    const startMs = startTime ? Date.parse(startTime) : 0;
    const endMs = endTime ? Date.parse(endTime) : startMs + 1;
    const derived = deriveFromSample(
      bucket.sample?.hits?.hits ?? [],
      startMs,
      endMs,
      bucket.identified?.sample?.hits?.hits ?? []
    );

    sessionsById.set(sessionId, {
      sessionId,
      startTime,
      endTime,
      eventCount: bucket.doc_count,
      errorCount: bucket.error_count?.doc_count ?? 0,
      actionCount: bucket.click_count?.doc_count ?? 0,
      rageClickCount: derived.rageClickCount,
      deadClickCount: derived.deadClickCount,
      errorGroups: derived.errorGroups,
      activeMs: derived.activeMs,
      durationMs: Math.max(0, endMs - startMs),
      pageCount: derived.pageCount > 0 ? derived.pageCount : replay?.derived.pageCount ?? 0,
      entryPage: derived.entryPage ?? replay?.derived.entryPage ?? null,
      exitPage: derived.exitPage ?? replay?.derived.exitPage ?? null,
      pagePath: derived.pagePath.length > 0 ? derived.pagePath : replay?.derived.pagePath ?? [],
      activityPath: derived.activityPath,
      sparkline: derived.sparkline,
      user: derived.user,
      client: derived.client,
      hasReplay: Boolean(replay),
      replayEventCount: replay?.eventCount ?? 0,
    });
  }

  // Replay-only sessions (SDK stamped session on replay docs but not yet on traces/logs).
  for (const [sessionId, replay] of replayById) {
    if (sessionsById.has(sessionId)) {
      continue;
    }
    sessionsById.set(sessionId, {
      sessionId,
      startTime: replay.startTime,
      endTime: replay.endTime,
      eventCount: 0,
      errorCount: 0,
      actionCount: 0,
      rageClickCount: replay.derived.rageClickCount,
      deadClickCount: replay.derived.deadClickCount,
      errorGroups: replay.derived.errorGroups,
      activeMs: replay.derived.activeMs,
      durationMs: (() => {
        const s = replay.startTime ? Date.parse(replay.startTime) : 0;
        const e = replay.endTime ? Date.parse(replay.endTime) : s;
        return Math.max(0, e - s);
      })(),
      pageCount: replay.derived.pageCount,
      entryPage: replay.derived.entryPage,
      exitPage: replay.derived.exitPage,
      pagePath: replay.derived.pagePath,
      activityPath: replay.derived.activityPath,
      sparkline: replay.derived.sparkline,
      user: replay.derived.user,
      client: replay.derived.client,
      hasReplay: true,
      replayEventCount: replay.eventCount,
    });
  }

  const all = [...sessionsById.values()].filter((session) => !isHeartbeatOnlySession(session));

  // Unprefixed remainder only — structured path/click/error/user already ran in ES.
  const term = (find.text ?? '').trim().toLowerCase().slice(0, 200);
  const searchFiltered = term
    ? all.filter((session) => {
        const name = session.user.name || session.user.email || session.user.id || '';
        const haystack = [
          session.sessionId,
          name,
          session.client.browser ?? '',
          session.client.os ?? '',
          ...session.pagePath,
          ...session.activityPath,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
    : all;

  const facets = computeFacets(searchFiltered);

  // Facet filters.
  const {
    hasReplay,
    hasErrors,
    hasRage,
    hasDead,
    hasBounced,
    browser,
    os,
    location,
    minDurationMs,
    maxDurationMs,
    errorGroup,
    sessionIds,
    frustration,
  } = params.query;
  const minDur = minDurationMs ? Number(minDurationMs) : undefined;
  const maxDur = maxDurationMs ? Number(maxDurationMs) : undefined;
  const idSet =
    sessionIds && sessionIds.trim()
      ? new Set(
          sessionIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 50)
        )
      : null;
  const wantRage = hasRage === 'true' || frustration === 'rage';
  const wantErrors = hasErrors === 'true' || frustration === 'error';
  const wantDead = hasDead === 'true' || frustration === 'dead';
  const wantBounced = hasBounced === 'true';
  const filtered = searchFiltered.filter((session) => {
    if (hasReplay === 'true' && !session.hasReplay) return false;
    if (wantErrors && session.errorCount === 0) return false;
    if (wantRage && session.rageClickCount === 0) return false;
    if (wantDead && session.deadClickCount === 0) return false;
    if (wantBounced && !isBouncedSession(session.pageCount)) return false;
    if (browser && session.client.browser !== browser) return false;
    if (os && session.client.os !== os) return false;
    if (location && session.client.countryIso !== location && session.client.country !== location) {
      return false;
    }
    if (minDur != null && session.durationMs < minDur) return false;
    if (maxDur != null && session.durationMs > maxDur) return false;
    if (errorGroup && !session.errorGroups.includes(errorGroup)) return false;
    if (idSet && !idSet.has(session.sessionId)) return false;
    return true;
  });

  const stats = computeStats(filtered);

  // Sort.
  const sortField = (params.query.sortField as SessionSortField) || 'startTime';
  const direction = params.query.sortDirection === 'asc' ? 1 : -1;
  const sortValue = (session: RumSessionSummary): number =>
    sortField === 'startTime'
      ? session.startTime
        ? Date.parse(session.startTime)
        : 0
      : session[sortField];
  filtered.sort((a, b) => (sortValue(a) - sortValue(b)) * direction);

  // Paginate.
  const perPage = Math.min(Math.max(Number(params.query.perPage) || 25, 1), 100);
  const page = Math.max(Number(params.query.page) || 0, 0);
  const sessions = filtered.slice(page * perPage, page * perPage + perPage);

  return { sessions, total: filtered.length, facets, stats };
};

const topBuckets = (
  sessions: RumSessionSummary[],
  pick: (session: RumSessionSummary) => string | null
): SessionListFacets['browsers'] => {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const key = pick(session);
    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
};

/** Stable display key for a session's user: name, else email, else id. */
const userKey = (session: RumSessionSummary): string | null =>
  session.user.name || session.user.email || session.user.id;

const computeFacets = (sessions: RumSessionSummary[]): SessionListFacets => ({
  browsers: topBuckets(sessions, (session) => session.client.browser),
  os: topBuckets(sessions, (session) => session.client.os),
  countries: topBuckets(sessions, (session) => session.client.countryIso || session.client.country),
  users: topBuckets(sessions, userKey),
  hasReplay: sessions.filter((session) => session.hasReplay).length,
  hasErrors: sessions.filter((session) => session.errorCount > 0).length,
  hasRage: sessions.filter((session) => session.rageClickCount > 0).length,
  hasBounced: sessions.filter((session) => isBouncedSession(session.pageCount)).length,
});

const computeStats = (sessions: RumSessionSummary[]): SessionListStats => {
  const durations = sessions
    .map((session) => session.durationMs)
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  const median =
    durations.length === 0
      ? 0
      : durations.length % 2 === 1
      ? durations[(durations.length - 1) / 2]
      : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);
  const bounce = sessionBounceCounts(sessions);
  return {
    total: sessions.length,
    withReplay: sessions.filter((session) => session.hasReplay).length,
    withErrors: sessions.filter((session) => session.errorCount > 0).length,
    rageClicks: sessions.reduce((sum, session) => sum + session.rageClickCount, 0),
    medianDurationMs: median,
    bounced: bounce.bounced,
    viewed: bounce.viewed,
  };
};
