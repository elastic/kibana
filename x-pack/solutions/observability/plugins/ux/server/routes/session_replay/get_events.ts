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
import { reassembleReplayEvents, type ReplayEventHitSource } from './reassemble_events';

export const getSessionReplayEventsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/sessions/{sessionId}/events',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({
      sessionId: t.string,
    }),
  }),
  handler: async ({ context, params, config }): Promise<SessionReplayEventsResponse> => {
    if (!config.sessionReplay.enabled) {
      const err = new Error('Session replay is disabled') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const { sessionId } = params.path;
    const { elasticsearch } = await context.core;

    const result = await elasticsearch.client.asCurrentUser.search({
      index: SESSION_REPLAY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 10000,
      query: {
        bool: {
          should: SESSION_ID_FIELDS.map((field) => ({ term: { [field]: sessionId } })),
          minimum_should_match: 1,
        },
      },
      sort: [
        { 'attributes.rr-web.event': { order: 'asc', unmapped_type: 'long' } },
        { 'attributes.rr-web.chunk': { order: 'asc', unmapped_type: 'long' } },
      ],
      _source: ['body', 'attributes', '@timestamp'],
    });

    const hits = result.hits.hits.map((hit) => (hit._source ?? {}) as ReplayEventHitSource);
    const events = reassembleReplayEvents(hits);

    return {
      sessionId,
      events,
      total: events.length,
    };
  },
});
