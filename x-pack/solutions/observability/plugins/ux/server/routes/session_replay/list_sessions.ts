/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import {
  RUM_SESSION_SOURCE_INDEX,
  SESSION_REPLAY_INDEX,
  type RumSessionSummary,
  type SessionListFacets,
  type SessionListResponse,
  type SessionListStats,
  type SessionSortField,
} from '../../../common/session_replay';
import {
  attrString,
  buildSparkline,
  clientFromHits,
  computeActiveMs,
  countRageClicks,
  dedupeConsecutive,
  docName,
  docTimestamp,
  isAssetPath,
  labelFromXPath,
  pageFromHit,
  userFromHits,
  type OtelHit,
} from './session_attributes';

interface SessionBucket {
  key: string;
  doc_count: number;
  start_time?: { value_as_string?: string; value?: number | null };
  end_time?: { value_as_string?: string; value?: number | null };
  error_count?: { doc_count: number };
  click_count?: { doc_count: number };
  sample?: { hits?: { hits?: OtelHit[] } };
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

const SAMPLE_SOURCE = ['name', 'event_name', '@timestamp', 'attributes', 'resource.attributes'];

interface SessionDerived {
  entryPage: string | null;
  exitPage: string | null;
  pagePath: string[];
  pageCount: number;
  activityPath: string[];
  rageClickCount: number;
  activeMs: number;
  sparkline: RumSessionSummary['sparkline'];
  user: RumSessionSummary['user'];
  client: RumSessionSummary['client'];
}

const deriveFromSample = (hits: OtelHit[], startMs: number, endMs: number): SessionDerived => {
  const pages: string[] = [];
  const activities: string[] = [];
  const clicks: Array<{ xpath: string | null; ts: number }> = [];
  const timestamps: number[] = [];

  for (const hit of hits) {
    const source = hit._source ?? {};
    const name = docName(source);
    const page = pageFromHit(source);
    const tsRaw = docTimestamp(source);
    const ts = tsRaw ? Date.parse(tsRaw) : NaN;
    if (Number.isFinite(ts)) {
      timestamps.push(ts);
    }

    const pageIsSignal =
      Boolean(page) &&
      !isAssetPath(page) &&
      (name === 'documentLoad' ||
        name === 'documentFetch' ||
        name === 'page.view' ||
        name === 'click' ||
        name === 'navigation' ||
        name == null);
    if (pageIsSignal && page && pages[pages.length - 1] !== page) {
      pages.push(page);
    }

    if (name === 'click') {
      const xpath = attrString(source, 'target_xpath');
      clicks.push({ xpath, ts: Number.isFinite(ts) ? ts : 0 });
      const label = labelFromXPath(xpath);
      if (label) {
        activities.push(label);
      }
    }
  }

  const pagePath = dedupeConsecutive(pages).slice(0, 12);
  const activityPath = dedupeConsecutive(activities).slice(0, 10);

  return {
    entryPage: pagePath[0] ?? null,
    exitPage: pagePath.length > 0 ? pagePath[pagePath.length - 1]! : null,
    pagePath,
    pageCount: pagePath.length,
    activityPath,
    rageClickCount: countRageClicks(clicks),
    activeMs: computeActiveMs(timestamps),
    sparkline: buildSparkline(hits, startMs, endMs),
    user: userFromHits(hits),
    client: clientFromHits(hits),
  };
};

/** Resolve session id from resource or document attributes (EDOT Browser). */
const SESSION_ID_SCRIPT = `
  def rum = doc.containsKey('resource.attributes.rum.sessionId') ? doc['resource.attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  def sid = doc.containsKey('resource.attributes.session.id') ? doc['resource.attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  def arum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (arum != null && arum.size() > 0) { return arum.value; }
  def asid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (asid != null && asid.size() > 0) { return asid.value; }
  return '';
`;

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
    query: t.partial({
      rangeFrom: t.string,
      rangeTo: t.string,
      serviceName: t.string,
      query: t.string,
      sortField: t.string,
      sortDirection: t.string,
      page: t.string,
      perPage: t.string,
      hasReplay: t.string,
      hasErrors: t.string,
      hasRage: t.string,
      browser: t.string,
      os: t.string,
      minDurationMs: t.string,
      maxDurationMs: t.string,
    }),
  }),
  handler: async ({ context, params }): Promise<SessionListResponse> => {
    const { rangeFrom = 'now-24h', rangeTo = 'now', serviceName } = params.query;
    // Server-side sort/paginate/search operate over a bounded candidate window derived
    // from the terms aggregation. Sufficient for the POC; true scale needs a composite agg.
    const candidateSize = 200;
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;

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

    const [rumResult, replayResult] = await Promise.all([
      client.search({
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: [timeFilter, ...serviceFilters] } },
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
              error_count: {
                filter: {
                  bool: {
                    should: [
                      { term: { event_name: 'exception' } },
                      { term: { name: 'exception' } },
                      { term: { 'attributes.event.outcome': 'failure' } },
                      { term: { 'attributes.log.level': 'ERROR' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
              click_count: { filter: { term: { name: 'click' } } },
              sample: {
                top_hits: {
                  size: 100,
                  sort: [{ '@timestamp': 'asc' as const }],
                  _source: SAMPLE_SOURCE,
                },
              },
            },
          },
        },
      }),
      client.search({
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: [timeFilter, ...serviceFilters] } },
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
      }),
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
          const derived = deriveFromSample(bucket.sample?.hits?.hits ?? [], startMs, endMs);
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
      const derived = deriveFromSample(bucket.sample?.hits?.hits ?? [], startMs, endMs);

      sessionsById.set(sessionId, {
        sessionId,
        startTime,
        endTime,
        eventCount: bucket.doc_count,
        errorCount: bucket.error_count?.doc_count ?? 0,
        actionCount: bucket.click_count?.doc_count ?? 0,
        rageClickCount: derived.rageClickCount,
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

    const all = [...sessionsById.values()];

    // Search (bounded to avoid unbounded scans of the term against every field).
    const term = (params.query.query ?? '').trim().toLowerCase().slice(0, 200);
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
    const { hasReplay, hasErrors, hasRage, browser, os, minDurationMs, maxDurationMs } =
      params.query;
    const minDur = minDurationMs ? Number(minDurationMs) : undefined;
    const maxDur = maxDurationMs ? Number(maxDurationMs) : undefined;
    const filtered = searchFiltered.filter((session) => {
      if (hasReplay === 'true' && !session.hasReplay) return false;
      if (hasErrors === 'true' && session.errorCount === 0) return false;
      if (hasRage === 'true' && session.rageClickCount === 0) return false;
      if (browser && session.client.browser !== browser) return false;
      if (os && session.client.os !== os) return false;
      if (minDur != null && session.durationMs < minDur) return false;
      if (maxDur != null && session.durationMs > maxDur) return false;
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
  },
});

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

const computeFacets = (sessions: RumSessionSummary[]): SessionListFacets => ({
  browsers: topBuckets(sessions, (session) => session.client.browser),
  os: topBuckets(sessions, (session) => session.client.os),
  hasReplay: sessions.filter((session) => session.hasReplay).length,
  hasErrors: sessions.filter((session) => session.errorCount > 0).length,
  hasRage: sessions.filter((session) => session.rageClickCount > 0).length,
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
  return {
    total: sessions.length,
    withReplay: sessions.filter((session) => session.hasReplay).length,
    withErrors: sessions.filter((session) => session.errorCount > 0).length,
    rageClicks: sessions.reduce((sum, session) => sum + session.rageClickCount, 0),
    medianDurationMs: median,
  };
};
