/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import { computePatterns, type SessionPatternsResponse } from '../../../common/session_patterns';
import { SAMPLE_SOURCE, SESSION_ID_SCRIPT } from './list_sessions';
import { kueryFilters } from '../rum/kuery';
import { groupingFromSettings } from '../../../common/session_replay_settings';
import { groupUrlPath } from '../../../common/url_grouping';
import { readSessionReplaySettings } from './settings';
import {
  collectSessionSignals,
  dedupeConsecutive,
  countRageClicks,
  type OtelHit,
} from './session_attributes';

const boundedString = (max: number) =>
  new t.Type<string, string, unknown>(
    `BoundedString(${max})`,
    (u): u is string => typeof u === 'string',
    (u, c) => (typeof u === 'string' && u.length <= max ? t.success(u) : t.failure(u, c)),
    t.identity
  );

interface PatternBucket {
  key: string;
  error_count?: { doc_count: number };
  sample?: { hits?: { hits?: OtelHit[] } };
}

export const getSessionPatternsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/patterns',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.partial({
      rangeFrom: boundedString(64),
      rangeTo: boundedString(64),
      serviceName: boundedString(256),
      kuery: boundedString(4096),
    }),
  }),
  handler: async ({ context, core, params }): Promise<SessionPatternsResponse> => {
    const rangeFrom = params.query.rangeFrom || 'now-24h';
    const rangeTo = params.query.rangeTo || 'now';
    const { serviceName, kuery } = params.query;
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;
    const coreStart = await core.start();
    const grouping = groupingFromSettings(
      await readSessionReplaySettings(coreStart.savedObjects.createInternalRepository())
    );

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

    const result = await client.search({
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { bool: { filter: [timeFilter, ...serviceFilters, ...kueryFilters(kuery)] } },
      aggs: {
        sessions: {
          terms: {
            script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
            size: 500,
          },
          aggs: {
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
    });

    const buckets =
      (result.aggregations as { sessions?: { buckets?: PatternBucket[] } })?.sessions?.buckets ??
      [];

    const sessions = buckets
      .filter((bucket) => Boolean(bucket.key))
      .map((bucket) => {
        const { pages, activities, clicks } = collectSessionSignals(
          bucket.sample?.hits?.hits ?? []
        );
        return {
          sessionId: String(bucket.key),
          pagePath: dedupeConsecutive(pages)
            .map((path) => groupUrlPath(path, grouping) || path)
            .slice(0, 12),
          activityPath: dedupeConsecutive(activities).slice(0, 10),
          errorCount: bucket.error_count?.doc_count ?? 0,
          rageClickCount: countRageClicks(clicks),
        };
      });

    return computePatterns(sessions);
  },
});
