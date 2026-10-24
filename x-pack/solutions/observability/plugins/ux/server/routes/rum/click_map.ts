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

const sessionIdTerms = (ids: string[], fields: readonly string[] = SESSION_ID_FIELDS) => ({
  bool: {
    should: fields.map((field) => ({ terms: { [field]: ids } })),
    minimum_should_match: 1,
  },
});

/** Mapped on `logs-rum.replay-*`. Painless terms over 200k docs is the slow path. */
const REPLAY_SESSION_ID_FIELDS = [
  'attributes.session.id',
  'attributes.rum.sessionId',
  'resource.attributes.session.id',
] as const;

const RRWEB_TYPE_FIELD = 'attributes.rrweb.type';
const RRWEB_SNAPSHOT_TYPES = [2, 4] as const;
const RRWEB_CLICK_TYPES = [2, 3, 4] as const;
const REPLAY_SESSION_CAP = 2;
const REPLAY_SNAPSHOT_SIZE = 200;
const REPLAY_CLICK_SAMPLE_SIZE = 2500;

export const replayBackdropEventsQuery = ({
  sessionId,
  needClicks,
}: {
  sessionId: string;
  needClicks: boolean;
}) => ({
  index: SESSION_REPLAY_INDEX,
  ignore_unavailable: true,
  allow_no_indices: true,
  size: needClicks ? REPLAY_CLICK_SAMPLE_SIZE : REPLAY_SNAPSHOT_SIZE,
  query: {
    bool: {
      filter: [
        sessionIdTerms([sessionId], REPLAY_SESSION_ID_FIELDS),
        {
          terms: {
            [RRWEB_TYPE_FIELD]: needClicks ? [...RRWEB_CLICK_TYPES] : [...RRWEB_SNAPSHOT_TYPES],
          },
        },
      ],
    },
  },
  sort: [
    { 'attributes.rr-web.event': { order: 'asc' as const, unmapped_type: 'long' as const } },
    { 'attributes.rr-web.chunk': { order: 'asc' as const, unmapped_type: 'long' as const } },
  ],
  _source: ['body', 'attributes', '@timestamp'],
});

export const getRumClickMapRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/click_map',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, core, params, request }): Promise<RumClickMapResponse> => {
    const client = await getRumSearchClient({ context, core, request });
    const requestedPage = params.query.pageUrl;
    const baseFilters = rumBaseFilters(params.query);
    const clickFilters = [...baseFilters, CLICK_FILTER, CLICK_COORD_FILTER];

    const [clickPagesResult, viewPagesResult] = await Promise.all([
      client.search(
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
      ),
      requestedPage
        ? Promise.resolve(null)
        : client.search(
            {
              index: RUM_SESSION_SOURCE_INDEX,
              ignore_unavailable: true,
              allow_no_indices: true,
              size: 0,
              query: { bool: { filter: [...baseFilters, PAGE_VIEW_FILTER] } },
              aggs: { pages: pagePathTerms(15) },
            },
            rumEsSearchOptions
          ),
    ]);

    let pages = facetFromScriptTerms(
      (clickPagesResult.aggregations as { pages?: unknown } | undefined)?.pages
    );
    const hasCoordClicks = pages.length > 0;
    if (!hasCoordClicks && viewPagesResult) {
      pages = facetFromScriptTerms(
        (viewPagesResult.aggregations as { pages?: unknown } | undefined)?.pages
      );
    }

    const pagePath = requestedPage || pages[0]?.key || null;

    let clickHits: OtelHit[] = requestedPage ? (clickPagesResult.hits.hits as OtelHit[]) ?? [] : [];

    if (!requestedPage && pagePath && hasCoordClicks) {
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
          clickSessionIds,
          parsed.length === 0
        )
      : { snapshot: null, clicks: [] as Array<{ x: number; y: number }> };

    const snapshot = replay.snapshot;
    const fromLogs = parsed.map((point) => ({
      x: point.x,
      y: point.y,
      viewportWidth: point.viewportWidth,
      sessionId: point.sessionId,
    }));
    const fromReplay = replay.clicks.map((point) => ({
      ...point,
      viewportWidth: snapshot?.width ?? null,
      sessionId: snapshot?.sessionId ?? null,
    }));
    const merged = fromLogs.length > 0 ? fromLogs : fromReplay;

    const viewportMatched = snapshot
      ? merged.filter((point) => inViewportBand(point.viewportWidth, snapshot.width))
      : merged;
    const usable = (viewportMatched.length >= 8 || !snapshot ? viewportMatched : merged).map(
      (point) => ({ x: point.x, y: point.y, sessionId: point.sessionId })
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
  clickSessionIds: string[],
  needReplayClicks: boolean
): Promise<{
  snapshot: RumClickMapResponse['snapshot'];
  clicks: Array<{ x: number; y: number }>;
}> => {
  let sessionIds = clickSessionIds.slice(0, REPLAY_SESSION_CAP);
  if (sessionIds.length === 0) {
    const timeFilter = {
      range: { '@timestamp': { gte: rangeFrom || 'now-24h', lte: rangeTo || 'now' } },
    };
    const replayAgg = await client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: [timeFilter, ...replayServiceFilter(serviceName)] } },
        aggs: {
          sessions: {
            terms: { field: 'attributes.session.id', size: REPLAY_SESSION_CAP, exclude: '' },
          },
        },
      },
      rumEsSearchOptions
    );
    sessionIds =
      replayAgg.aggregations?.sessions?.buckets
        ?.map((bucket) => String(bucket.key))
        .filter((id) => id.length > 0) ?? [];
  }

  const clicks: Array<{ x: number; y: number }> = [];
  let snapshot: RumClickMapResponse['snapshot'] = null;

  for (const sessionId of sessionIds) {
    const eventsResult = await client.search(
      replayBackdropEventsQuery({ sessionId, needClicks: needReplayClicks }),
      rumEsSearchOptions
    );

    const events = reassembleReplayEvents(
      (eventsResult.hits?.hits ?? []).map((hit) => (hit._source ?? {}) as ReplayEventHitSource)
    );
    if (needReplayClicks) {
      const replayClicks = extractReplayClicks(events, pagePath);
      clicks.push(...(replayClicks.length > 0 ? replayClicks : extractReplayClicks(events)));
    }
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
    if (snapshot && (!needReplayClicks || clicks.length > 0)) {
      break;
    }
  }

  return { snapshot, clicks };
};
