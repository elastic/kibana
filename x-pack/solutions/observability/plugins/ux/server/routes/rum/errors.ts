/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import {
  isNewInRange,
  makeErrorGroupKey,
  type RumErrorGroup,
  type RumErrorTrendPoint,
  type RumErrorsResponse,
} from '../../../common/rum_app';
import { SAMPLE_SOURCE } from '../session_replay/list_sessions';
import {
  attrString,
  errorGroupFromHit,
  pageFromHit,
  traceIdFromHit,
  type OtelHit,
} from '../session_replay/session_attributes';
import { rumEsSearchOptions } from './es_retry';
import {
  EXCEPTION_FILTER,
  cardValue,
  identifiedUsers,
  pagePathTerms,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

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

const trendPointsFromAgg = (agg: unknown): RumErrorTrendPoint[] =>
  termsBuckets((agg as { buckets?: unknown } | undefined) ?? agg).map((point) => ({
    timestamp:
      (point as { key_as_string?: string }).key_as_string ??
      new Date(Number(point.key)).toISOString(),
    count: point.doc_count,
  }));

const rangeBoundsMs = (rangeFrom?: string, rangeTo?: string): { from: number; to: number } => {
  const from = dateMath.parse(rangeFrom || 'now-24h')?.valueOf();
  const to = dateMath.parse(rangeTo || 'now', { roundUp: true })?.valueOf();
  return {
    from:
      typeof from === 'number' && Number.isFinite(from) ? from : Date.now() - 24 * 60 * 60 * 1000,
    to: typeof to === 'number' && Number.isFinite(to) ? to : Date.now(),
  };
};

const ERROR_GROUP_SCRIPT = `
  try {
    def type = '';
    if (doc.containsKey('attributes.exception.type') && doc['attributes.exception.type'].size() > 0) {
      type = doc['attributes.exception.type'].value.toString();
    } else if (doc.containsKey('attributes.error.type') && doc['attributes.error.type'].size() > 0) {
      type = doc['attributes.error.type'].value.toString();
    }
    if (type.length() == 0) { type = 'Error'; }
    if (type.length() > 80) { type = type.substring(0, 80); }
    def msg = '';
    if (doc.containsKey('attributes.exception.message') && doc['attributes.exception.message'].size() > 0) {
      msg = doc['attributes.exception.message'].value.toString();
    } else if (doc.containsKey('attributes.error.message') && doc['attributes.error.message'].size() > 0) {
      msg = doc['attributes.error.message'].value.toString();
    }
    int nl = msg.indexOf((char)10);
    if (nl >= 0) { msg = msg.substring(0, nl); }
    msg = msg.trim();
    if (msg.length() > 120) { msg = msg.substring(0, 120); }
    return type + '|' + msg;
  } catch (Exception e) {
    return 'Error|';
  }
`;

export const getRumErrorsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/errors',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, params }): Promise<RumErrorsResponse> => {
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;

    const baseFilters = rumBaseFilters(params.query);
    const bounds = rangeBoundsMs(params.query.rangeFrom, params.query.rangeTo);

    const [result, sessionTotal] = await Promise.all([
      client.search(
        {
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          query: { bool: { filter: [...baseFilters, EXCEPTION_FILTER] } },
          aggs: {
            sessions: sessionCardinality,
            users: identifiedUsers,
            groups: {
              terms: {
                script: { source: ERROR_GROUP_SCRIPT, lang: 'painless' },
                size: 50,
              },
              aggs: {
                sessions: sessionCardinality,
                users: identifiedUsers,
                first_seen: { min: { field: '@timestamp' } },
                last_seen: { max: { field: '@timestamp' } },
                pages: pagePathTerms(3),
                trend: {
                  auto_date_histogram: { field: '@timestamp', buckets: 16 },
                },
                sample: {
                  top_hits: {
                    size: 1,
                    sort: [{ '@timestamp': 'desc' as const }],
                    _source: SAMPLE_SOURCE,
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
          index: RUM_SESSION_SOURCE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 0,
          query: { bool: { filter: baseFilters } },
          aggs: { sessions: sessionCardinality },
        },
        rumEsSearchOptions
      ),
    ]);

    const groups: RumErrorGroup[] = termsBuckets(
      (result.aggregations as { groups?: unknown } | undefined)?.groups
    ).map((bucket) => {
      const sampleHit = (bucket.sample as { hits?: { hits?: OtelHit[] } } | undefined)?.hits
        ?.hits?.[0];
      const source = sampleHit?._source ?? {};
      const parsed = errorGroupFromHit(source);
      const type =
        parsed?.type ??
        attrString(source, 'exception.type') ??
        attrString(source, 'error.type') ??
        'Error';
      const message =
        parsed?.message ??
        attrString(source, 'exception.message') ??
        attrString(source, 'error.message') ??
        String(bucket.key);
      const trendPoints = trendPointsFromAgg(
        (bucket.trend as { buckets?: unknown } | undefined) ?? bucket.trend
      );
      const firstSeen = toIso(
        bucket.first_seen as { value_as_string?: string; value?: number | null }
      );
      const lastSeen = toIso(
        bucket.last_seen as { value_as_string?: string; value?: number | null }
      );
      const firstSeenMs = firstSeen ? Date.parse(firstSeen) : NaN;

      return {
        key: String(bucket.key) || makeErrorGroupKey(type, message),
        type,
        message,
        count: bucket.doc_count,
        sessionCount: ((bucket.sessions as { value?: number } | undefined)?.value ?? 0) as number,
        userCount: (bucket.users as { count?: { value?: number } } | undefined)?.count?.value ?? 0,
        sampleStack:
          attrString(source, 'exception.stacktrace') ??
          attrString(source, 'error.stacktrace') ??
          null,
        groupingKey: attrString(source, 'error.grouping_key') ?? attrString(source, 'grouping_key'),
        trend: trendPoints.map((point) => point.count),
        trendPoints,
        firstSeen,
        lastSeen,
        isNew: isNewInRange(firstSeenMs, bounds.from, bounds.to),
        affectedPages: termsBuckets(bucket.pages)
          .map((page) => ({ path: String(page.key), count: page.doc_count }))
          .filter((page) => page.path.length > 0),
        samplePage: pageFromHit(source),
        sampleAction:
          attrString(source, 'user_action.name') ?? attrString(source, 'user_action.id'),
        sampleTraceId: traceIdFromHit(source),
      };
    });

    const errorEvents = groups.reduce((sum, group) => sum + group.count, 0);
    const aggs = result.aggregations as
      | { sessions?: unknown; users?: { count?: { value?: number } } }
      | undefined;

    return {
      groups,
      total: errorEvents,
      kpis: {
        errorEvents,
        impactedSessions: cardValue(aggs?.sessions),
        totalSessions: cardValue(
          (sessionTotal.aggregations as { sessions?: unknown } | undefined)?.sessions
        ),
        impactedUsers: aggs?.users?.count?.value ?? 0,
        newGroups: groups.filter((group) => group.isNew).length,
      },
    };
  },
});
