/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import {
  SESSION_ID_FIELDS,
  SESSION_REPLAY_INDEX,
  type SessionReplayEventsResponse,
} from '../../../common/session_replay';
import {
  FULL_REPLAY_EVENT_PAGE_SIZE,
  LIVE_EVENT_PAGE_SIZE,
  LIVE_EVENT_PAGE_SIZE_MAX,
} from '../../../common/session_replay_live';
import { boundedString } from '../rum/query';
import { rumEsSearchOptions } from '../rum/es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import { reassembleReplayEventsWithCursor, type ReplayEventHitSource } from './reassemble_events';

const parseOptionalInt = (raw: string | undefined): number | undefined => {
  if (raw == null || raw === '') {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
};

export const getSessionReplayEventsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/sessions/{sessionId}/events',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.intersection([
    t.type({
      path: t.type({
        sessionId: t.string,
      }),
    }),
    t.partial({
      query: t.partial({
        afterEvent: boundedString(16),
        size: boundedString(8),
      }),
    }),
  ]),
  handler: async ({ context, core, params, request }): Promise<SessionReplayEventsResponse> => {
    const { sessionId } = params.path;
    const afterEvent = parseOptionalInt(params.query?.afterEvent);
    const requestedSize = parseOptionalInt(params.query?.size);
    const incremental = afterEvent != null;
    const cap = incremental ? LIVE_EVENT_PAGE_SIZE_MAX : FULL_REPLAY_EVENT_PAGE_SIZE;
    const fallback = incremental ? LIVE_EVENT_PAGE_SIZE : FULL_REPLAY_EVENT_PAGE_SIZE;
    const size = Math.min(requestedSize ?? fallback, cap);
    const client = await getRumSearchClient({ context, core, request });

    const filters: object[] = [
      {
        bool: {
          should: SESSION_ID_FIELDS.map((field) => ({ term: { [field]: sessionId } })),
          minimum_should_match: 1,
        },
      },
    ];
    if (afterEvent != null) {
      filters.push({ range: { 'attributes.rr-web.event': { gt: afterEvent } } });
    }

    const result = await client.search(
      {
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size,
        query: { bool: { filter: filters } },
        sort: [
          { 'attributes.rr-web.event': { order: 'asc', unmapped_type: 'long' } },
          { 'attributes.rr-web.chunk': { order: 'asc', unmapped_type: 'long' } },
        ],
        _source: ['body', 'attributes', '@timestamp'],
      },
      rumEsSearchOptions
    );

    const hits = result.hits.hits.map((hit) => (hit._source ?? {}) as ReplayEventHitSource);
    const assembled = reassembleReplayEventsWithCursor(hits);

    return {
      sessionId,
      events: assembled.events,
      total: assembled.events.length,
      lastCompleteEvent: assembled.lastCompleteEvent ?? afterEvent ?? null,
    };
  },
});
