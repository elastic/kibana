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
  SESSION_ID_FIELDS,
  SESSION_REPLAY_INDEX,
} from '../../../common/session_replay';
import {
  binClicks,
  extractPageSnapshot,
  extractReplayClicks,
  inViewportBand,
  isOnSnapshotViewport,
  type RumClickMapResponse,
} from '../../../common/rum_click_map';
import { OTEL_EVENT_USER_ACTION_CLICK } from '../../../common/otel_rum';
import { attrNumber, attrString, type OtelHit } from '../session_replay/session_attributes';
import {
  reassembleReplayEvents,
  type ReplayEventHitSource,
} from '../session_replay/reassemble_events';
import { rumEsSearchOptions } from './es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import {
  PAGE_VIEW_FILTER,
  facetFromScriptTerms,
  luceneEscape,
  pagePathTerms,
  rumBaseFilters,
  rumListQueryCodec,
} from './query';

const CLICK_FILTER = {
  bool: {
    should: [
      { term: { event_name: OTEL_EVENT_USER_ACTION_CLICK } },
      { term: { name: OTEL_EVENT_USER_ACTION_CLICK } },
    ],
    minimum_should_match: 1,
  },
};

const CLICK_COORD_FILTER = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            { exists: { field: 'attributes.browser.page.x' } },
            { exists: { field: 'browser.page.x' } },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          should: [
            { exists: { field: 'attributes.browser.page.y' } },
            { exists: { field: 'browser.page.y' } },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
};

const CLICK_SOURCE = ['event_name', 'name', 'attributes', 'resource.attributes'];

const REPLAY_SESSION_ID_SCRIPT = `
  def rum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  def sid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  return '';
`;

const sessionIdFromHit = (source: Record<string, unknown>): string | null =>
  attrString(source, 'session.id') || attrString(source, 'rum.sessionId');

const parseClick = (
  source: Record<string, unknown>
): { x: number; y: number; viewportWidth: number | null; sessionId: string | null } | null => {
  const x = attrNumber(source, 'browser.page.x');
  const y = attrNumber(source, 'browser.page.y');
  if (x == null || y == null) {
    return null;
  }
  return {
    x,
    y,
    viewportWidth: attrNumber(source, 'browser.viewport.width'),
    sessionId: sessionIdFromHit(source),
  };
};

const sessionIdTerms = (ids: string[]) => ({
  bool: {
    should: SESSION_ID_FIELDS.map((field) => ({ terms: { [field]: ids } })),
    minimum_should_match: 1,
  },
});

export const getRumClickMapRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/click_map',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, core, params }): Promise<RumClickMapResponse> => {
    const client = await getRumSearchClient({ context, core });
    const requestedPage = params.query.pageUrl;
    const baseFilters = rumBaseFilters(params.query);
    const clickFilters = [...baseFilters, CLICK_FILTER, CLICK_COORD_FILTER];

    const pagesResult = await client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: requestedPage ? 1500 : 0,
        query: { bool: { filter: clickFilters } },
        aggs: { pages: pagePathTerms(15) },
        ...(requestedPage
          ? { _source: CLICK_SOURCE, sort: [{ '@timestamp': { order: 'desc' as const } }] }
          : {}),
      },
      rumEsSearchOptions
    );

    let pages = facetFromScriptTerms(
      (pagesResult.aggregations as { pages?: unknown } | undefined)?.pages
    );

    if (pages.length === 0) {
      const pageViews = await client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          query: { bool: { filter: [...baseFilters, PAGE_VIEW_FILTER] } },
          aggs: { pages: pagePathTerms(15) },
        },
        rumEsSearchOptions
      );
      pages = facetFromScriptTerms(
        (pageViews.aggregations as { pages?: unknown } | undefined)?.pages
      );
    }

    const pagePath = requestedPage || pages[0]?.key || null;

    let clickHits: OtelHit[] = requestedPage ? (pagesResult.hits.hits as OtelHit[]) ?? [] : [];

    if (!requestedPage && pagePath) {
      const sampled = await client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 1500,
          query: {
            bool: {
              filter: rumBaseFilters({ ...params.query, pageUrl: pagePath }).concat(
                CLICK_FILTER,
                CLICK_COORD_FILTER
              ),
            },
          },
          sort: [{ '@timestamp': { order: 'desc' as const } }],
          _source: CLICK_SOURCE,
        },
        rumEsSearchOptions
      );
      clickHits = (sampled.hits.hits as OtelHit[]) ?? [];
    }

    const parsed = clickHits
      .map((hit) => parseClick((hit._source ?? {}) as Record<string, unknown>))
      .filter((point): point is NonNullable<typeof point> => point != null);

    const clickSessionIds = [
      ...new Set(parsed.map((point) => point.sessionId).filter((id): id is string => Boolean(id))),
    ].slice(0, 30);

    const replay = pagePath
      ? await loadReplayBackdrop(
          client as never,
          params.query.rangeFrom,
          params.query.rangeTo,
          params.query.serviceName,
          pagePath,
          clickSessionIds
        )
      : { snapshot: null, clicks: [] as Array<{ x: number; y: number }> };

    const snapshot = replay.snapshot;
    const fromLogs = parsed.map((point) => ({
      x: point.x,
      y: point.y,
      viewportWidth: point.viewportWidth,
    }));
    const fromReplay = replay.clicks.map((point) => ({
      ...point,
      viewportWidth: snapshot?.width ?? null,
    }));
    const merged = fromLogs.length > 0 ? fromLogs : fromReplay;

    const viewportMatched = snapshot
      ? merged.filter((point) => inViewportBand(point.viewportWidth, snapshot.width))
      : merged;
    const usable = (viewportMatched.length >= 8 || !snapshot ? viewportMatched : merged).map(
      (point) => ({ x: point.x, y: point.y })
    );

    const onViewport = snapshot
      ? usable.filter((point) => isOnSnapshotViewport(point, snapshot.width, snapshot.height))
      : usable;

    return {
      pagePath,
      pages,
      totalClicks: merged.length,
      sampledClicks: onViewport.length,
      hiddenOffViewport: Math.max(0, usable.length - onViewport.length),
      clicks: binClicks(onViewport),
      snapshot,
    };
  },
});

const replayServiceFilter = (serviceName?: string): object[] => {
  if (!serviceName) {
    return [];
  }
  return [
    {
      bool: {
        should: [
          { term: { 'resource.attributes.service.name': serviceName } },
          { term: { 'attributes.service.name': serviceName } },
        ],
        minimum_should_match: 1,
      },
    },
  ];
};

const replayPageFilter = (pagePath: string): object => {
  const needle = luceneEscape(pagePath.trim().replace(/[*?]/g, '')).slice(0, 200);
  return {
    query_string: {
      query: `*${needle}*`,
      fields: ['attributes.page.url.path', 'attributes.page.url', 'page.url.path', 'page.url'],
      lenient: true,
      analyze_wildcard: true,
    },
  };
};

const loadReplayBackdrop = async (
  client: {
    search: (
      req: Record<string, unknown>,
      opts?: typeof rumEsSearchOptions
    ) => Promise<{
      aggregations?: { sessions?: { buckets?: Array<{ key: string | number }> } };
      hits?: { hits?: Array<{ _source?: ReplayEventHitSource }> };
    }>;
  },
  rangeFrom: string | undefined,
  rangeTo: string | undefined,
  serviceName: string | undefined,
  pagePath: string,
  clickSessionIds: string[]
): Promise<{
  snapshot: RumClickMapResponse['snapshot'];
  clicks: Array<{ x: number; y: number }>;
}> => {
  const timeFilter = {
    range: { '@timestamp': { gte: rangeFrom || 'now-24h', lte: rangeTo || 'now' } },
  };
  const filters: object[] = [
    timeFilter,
    ...replayServiceFilter(serviceName),
    replayPageFilter(pagePath),
  ];
  if (clickSessionIds.length > 0) {
    filters.push(sessionIdTerms(clickSessionIds));
  }

  const replayAgg = await client.search(
    {
      index: SESSION_REPLAY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        sessions: {
          terms: { script: { source: REPLAY_SESSION_ID_SCRIPT, lang: 'painless' }, size: 8 },
        },
      },
    },
    rumEsSearchOptions
  );

  let sessionIds =
    replayAgg.aggregations?.sessions?.buckets
      ?.map((bucket) => String(bucket.key))
      .filter((id) => id.length > 0) ?? [];

  if (sessionIds.length === 0) {
    const fallback = await client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: [timeFilter, ...replayServiceFilter(serviceName)] } },
        aggs: {
          sessions: {
            terms: { script: { source: REPLAY_SESSION_ID_SCRIPT, lang: 'painless' }, size: 8 },
          },
        },
      },
      rumEsSearchOptions
    );
    sessionIds =
      fallback.aggregations?.sessions?.buckets
        ?.map((bucket) => String(bucket.key))
        .filter((id) => id.length > 0) ?? [];
  }

  const clicks: Array<{ x: number; y: number }> = [];
  let snapshot: RumClickMapResponse['snapshot'] = null;

  for (const sessionId of sessionIds) {
    const eventsResult = await client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 10000,
        query: { bool: { filter: [sessionIdTerms([sessionId])] } },
        sort: [
          { 'attributes.rr-web.event': { order: 'asc', unmapped_type: 'long' } },
          { 'attributes.rr-web.chunk': { order: 'asc', unmapped_type: 'long' } },
        ],
        _source: ['body', 'attributes', '@timestamp'],
      },
      rumEsSearchOptions
    );

    const events = reassembleReplayEvents(
      (eventsResult.hits?.hits ?? []).map((hit) => (hit._source ?? {}) as ReplayEventHitSource)
    );
    const replayClicks = extractReplayClicks(events, pagePath);
    clicks.push(...(replayClicks.length > 0 ? replayClicks : extractReplayClicks(events)));
    if (!snapshot) {
      const extracted = extractPageSnapshot(events, pagePath) ?? extractPageSnapshot(events);
      if (extracted) {
        snapshot = {
          sessionId,
          href: extracted.href,
          width: extracted.width,
          height: extracted.height,
          events: extracted.events,
        };
      }
    }
  }

  return { snapshot, clicks };
};
