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
  type RumSessionDetail,
} from '../../../common/session_replay';
import { boundedString, rumListQueryCodec } from '../rum/query';
import { rumEsSearchOptions } from '../rum/es_retry';
import { CLICK_FILTER, EXCEPTION_FILTER } from '../../transforms/rum_sessions_spec';
import { getRumSearchClient } from '../../lib/rum_search_client';
import {
  SESSION_DETAIL_ERROR_HIT_SIZE,
  SESSION_DETAIL_HIT_SIZE,
  buildSessionDetail,
  mergeSessionHits,
  sessionSpanFromSearch,
  type SessionSpanAggs,
} from './session_detail';
import type { OtelHit } from './session_attributes';

const sessionMatchFields = SESSION_ID_FIELDS.flatMap((field) => [field, `resource.${field}`]);

const SESSION_DETAIL_SOURCE = [
  'name',
  'event_name',
  '@timestamp',
  'attributes',
  'resource.attributes',
  'trace',
  'span',
  'trace.id',
  'span.id',
  'trace_id',
  'span_id',
];

export const getSessionRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/sessions/{sessionId}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  // A session id uniquely identifies the session, so the detail lookup is not
  // time-scoped (a session outside the caller's selected range must still load).
  params: t.intersection([
    t.type({
      path: t.type({ sessionId: boundedString(128) }),
    }),
    t.partial({ query: rumListQueryCodec }),
  ]),
  handler: async ({ context, core, params, request }): Promise<RumSessionDetail> => {
    const { sessionId } = params.path;
    const client = await getRumSearchClient({ context, core, request });

    const sessionMatch = {
      bool: {
        should: sessionMatchFields.map((field) => ({ term: { [field]: sessionId } })),
        minimum_should_match: 1,
      },
    };

    const [rumResult, errorResult, replayResult] = await Promise.all([
      client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: SESSION_DETAIL_HIT_SIZE,
          track_total_hits: true,
          sort: [{ '@timestamp': 'asc' as const }],
          query: { bool: { must: [sessionMatch] } },
          aggs: {
            min_ts: { min: { field: '@timestamp' } },
            max_ts: { max: { field: '@timestamp' } },
            error_count: { filter: EXCEPTION_FILTER },
            click_count: { filter: CLICK_FILTER },
          },
          _source: SESSION_DETAIL_SOURCE,
        },
        rumEsSearchOptions
      ),
      client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: SESSION_DETAIL_ERROR_HIT_SIZE,
          sort: [{ '@timestamp': 'asc' as const }],
          query: { bool: { must: [sessionMatch, EXCEPTION_FILTER] } },
          _source: SESSION_DETAIL_SOURCE,
        },
        rumEsSearchOptions
      ),
      client.count({
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { must: [sessionMatch] } },
      }),
    ]);

    const sampled = rumResult.hits.hits as OtelHit[];
    const errorHits = errorResult.hits.hits as OtelHit[];
    const hits = mergeSessionHits(sampled, errorHits);
    const span = sessionSpanFromSearch(
      rumResult.aggregations as SessionSpanAggs | undefined,
      hits,
      rumResult.hits.total
    );

    return buildSessionDetail({
      sessionId,
      hits,
      span,
      replayEventCount: replayResult.count ?? 0,
    });
  },
});
