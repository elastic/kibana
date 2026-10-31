/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import {
  SESSION_REPLAY_INDEX,
  type LiveReplaySession,
  type LiveReplaySessionsResponse,
} from '../../../common/session_replay';
import {
  LIVE_LOOKBACK_SECONDS,
  LIVE_LOOKBACK_SECONDS_MAX,
  LIVE_LOOKBACK_SECONDS_MIN,
  LIVE_SESSION_LIST_SIZE,
  LIVE_SESSION_LIST_SIZE_MAX,
} from '../../../common/session_replay_live';
import { boundedString } from '../rum/query';
import { rumEsSearchOptions } from '../rum/es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import { REPLAY_SERVICE_NAME_SCRIPT, REPLAY_SESSION_ID_SCRIPT } from './session_id_script';

interface LiveSessionBucket {
  key?: string | number;
  doc_count?: number;
  last_seen?: { value_as_string?: string; value?: number | null };
  last_event?: { value?: number | null };
  service?: { buckets?: Array<{ key?: string | number }> };
}

const clampInt = (raw: string | undefined, fallback: number, min: number, max: number): number => {
  if (raw == null || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
};

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

export const listLiveReplaySessionsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/live',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.partial({
      lookbackSeconds: boundedString(8),
      serviceName: boundedString(256),
      size: boundedString(8),
    }),
  }),
  handler: async ({ context, core, params, request }): Promise<LiveReplaySessionsResponse> => {
    const lookbackSeconds = clampInt(
      params.query.lookbackSeconds,
      LIVE_LOOKBACK_SECONDS,
      LIVE_LOOKBACK_SECONDS_MIN,
      LIVE_LOOKBACK_SECONDS_MAX
    );
    const size = clampInt(params.query.size, LIVE_SESSION_LIST_SIZE, 1, LIVE_SESSION_LIST_SIZE_MAX);
    const { serviceName } = params.query;
    const client = await getRumSearchClient({ context, core, request });

    const filters: object[] = [{ range: { '@timestamp': { gte: `now-${lookbackSeconds}s` } } }];
    if (serviceName) {
      filters.push({
        bool: {
          should: [
            { term: { 'resource.attributes.service.name': serviceName } },
            { term: { 'attributes.service.name': serviceName } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const result = await client.search(
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
              size,
              order: { last_seen: 'desc' },
              exclude: '',
            },
            aggs: {
              last_seen: { max: { field: '@timestamp' } },
              last_event: { max: { field: 'attributes.rr-web.event' } },
              service: {
                terms: {
                  script: { source: REPLAY_SERVICE_NAME_SCRIPT, lang: 'painless' },
                  size: 1,
                  exclude: '',
                },
              },
            },
          },
        },
      },
      rumEsSearchOptions
    );

    const buckets =
      (result.aggregations as { sessions?: { buckets?: LiveSessionBucket[] } })?.sessions
        ?.buckets ?? [];

    const sessions: LiveReplaySession[] = buckets
      .map((bucket) => {
        const sessionId = String(bucket.key ?? '').trim();
        const lastEvent = bucket.last_event?.value;
        const sessionService = String(bucket.service?.buckets?.[0]?.key ?? '').trim();
        return {
          sessionId,
          lastSeen: toIso(bucket.last_seen),
          eventCount:
            typeof lastEvent === 'number' && Number.isFinite(lastEvent)
              ? lastEvent
              : bucket.doc_count ?? 0,
          serviceName: sessionService.length > 0 ? sessionService : null,
        };
      })
      .filter((session) => session.sessionId.length > 0);

    return { sessions, lookbackSeconds };
  },
});
