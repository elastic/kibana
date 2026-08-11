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
  type SessionReplaySessionSummary,
} from '../../../common/session_replay';

interface SessionBucket {
  key: string;
  doc_count: number;
  start_time?: { value_as_string?: string; value?: number | null };
  end_time?: { value_as_string?: string; value?: number | null };
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

const SESSION_ID_SCRIPT = `
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
      size: t.string,
    }),
  }),
  handler: async ({ context, params }): Promise<{ sessions: SessionReplaySessionSummary[] }> => {
    const { rangeFrom = 'now-24h', rangeTo = 'now', size = '25' } = params.query;
    const sizeNum = Math.min(Math.max(Number(size) || 25, 1), 100);

    const { elasticsearch } = await context.core;
    const result = await elasticsearch.client.asCurrentUser.search({
      index: SESSION_REPLAY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: rangeFrom, lte: rangeTo } } }],
        },
      },
      aggs: {
        sessions: {
          terms: {
            script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
            size: sizeNum,
            order: { start_time: 'desc' },
          },
          aggs: {
            start_time: { min: { field: '@timestamp' } },
            end_time: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const buckets =
      (result.aggregations as { sessions?: { buckets?: SessionBucket[] } })?.sessions?.buckets ??
      [];

    return {
      sessions: buckets
        .filter((bucket) => Boolean(bucket.key))
        .map((bucket) => ({
          sessionId: String(bucket.key),
          startTime: toIso(bucket.start_time),
          endTime: toIso(bucket.end_time),
          eventCount: bucket.doc_count,
        })),
    };
  },
});
