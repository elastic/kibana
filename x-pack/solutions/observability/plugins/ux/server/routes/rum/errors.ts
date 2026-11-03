/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import * as t from 'io-ts';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { OTEL_SERVICE_NAME } from '../../../common/otel_rum';
import {
  classifyErrorPattern,
  isNewInRange,
  makeErrorGroupKey,
  mergePreferOtelByName,
  rumFailingApps,
  type RumErrorAppCount,
  type RumErrorGroup,
  type RumErrorTrendPoint,
  type RumErrorsResponse,
  type RumFailingApp,
} from '../../../common/rum_app';
import { previousEqualPeriod } from '../../../common/rum_report';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import { createUxServerRoute } from '../create_ux_server_route';
import { SAMPLE_SOURCE } from '../session_replay/list_sessions';
import {
  attrString,
  errorGroupFromHit,
  exceptionMessageFromSource,
  pageFromHit,
  traceIdFromHit,
  type OtelHit,
} from '../session_replay/session_attributes';
import { rumEsSearchOptions } from './es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
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
    def nl = '' + (char)10;
    def type = '';
    if (doc.containsKey('attributes.exception.type') && doc['attributes.exception.type'].size() > 0) {
      type = doc['attributes.exception.type'].value.toString();
    } else if (doc.containsKey('attributes.error.type') && doc['attributes.error.type'].size() > 0) {
      type = doc['attributes.error.type'].value.toString();
    } else if (doc.containsKey('attributes.error.group') && doc['attributes.error.group'].size() > 0) {
      type = doc['attributes.error.group'].value.toString();
    }
    if (type.length() == 0) { type = 'Error'; }
    if (type.length() > 80) { type = type.substring(0, 80); }
    def msg = '';
    if (doc.containsKey('attributes.exception.message') && doc['attributes.exception.message'].size() > 0) {
      msg = doc['attributes.exception.message'].value.toString();
    } else if (doc.containsKey('attributes.error.message') && doc['attributes.error.message'].size() > 0) {
      msg = doc['attributes.error.message'].value.toString();
    }
    if (msg.length() == 0 && doc.containsKey('attributes.exception.stacktrace') && doc['attributes.exception.stacktrace'].size() > 0) {
      def stack = doc['attributes.exception.stacktrace'].value.toString();
      int br = stack.indexOf(nl);
      def first = (br >= 0 ? stack.substring(0, br) : stack).trim();
      def prefix = type + ':';
      if (first.startsWith(prefix)) {
        msg = first.substring(prefix.length()).trim();
      } else if (first.length() > 0) {
        msg = first;
      }
    }
    int lineBreak = msg.indexOf(nl);
    if (lineBreak >= 0) { msg = msg.substring(0, lineBreak); }
    msg = msg.trim();
    if (msg.length() > 120) { msg = msg.substring(0, 120); }
    return type + '|' + msg;
  } catch (Exception e) {
    return 'Error|';
  }
`;

const GROUP_SIZE = 50;
const APP_BREAKDOWN_SIZE = 8;
const FAILING_APP_SIZE = 20;

const appTerms = (size: number, withSessions: boolean) => ({
  otelApps: {
    terms: { field: OTEL_SERVICE_NAME, size },
    ...(withSessions ? { aggs: { sessions: sessionCardinality } } : {}),
  },
  classicApps: {
    terms: { field: SERVICE_NAME, size },
    ...(withSessions ? { aggs: { sessions: sessionCardinality } } : {}),
  },
});

const namedCounts = (agg: unknown): RumErrorAppCount[] =>
  termsBuckets(agg)
    .map((bucket) => ({ name: String(bucket.key), count: bucket.doc_count }))
    .filter((row) => row.name.length > 0);

const failingRows = (
  agg: unknown
): Array<{
  name: string;
  errorEvents: number;
  impactedSessions: number;
}> =>
  termsBuckets(agg)
    .map((bucket) => ({
      name: String(bucket.key),
      errorEvents: bucket.doc_count,
      impactedSessions: cardValue(bucket.sessions),
    }))
    .filter((row) => row.name.length > 0);

const sessionRows = (agg: unknown): Array<{ name: string; totalSessions: number }> =>
  termsBuckets(agg)
    .map((bucket) => ({
      name: String(bucket.key),
      totalSessions: cardValue(bucket.sessions),
    }))
    .filter((row) => row.name.length > 0);

const previousCounts = (agg: unknown): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const bucket of termsBuckets(agg)) {
    counts.set(String(bucket.key), bucket.doc_count);
  }
  return counts;
};

export const getRumErrorsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/errors',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, core, params, request }): Promise<RumErrorsResponse> => {
    const client = await getRumSearchClient({ context, core, request });

    const baseFilters = rumBaseFilters(params.query);
    const bounds = rangeBoundsMs(params.query.rangeFrom, params.query.rangeTo);
    const period = previousEqualPeriod(
      params.query.rangeFrom || 'now-24h',
      params.query.rangeTo || 'now'
    );
    const previousFilters = period
      ? rumBaseFilters({
          ...params.query,
          rangeFrom: period.compareFrom,
          rangeTo: period.compareTo,
        })
      : null;

    const [result, sessionTotal, previous] = await Promise.all([
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
                size: GROUP_SIZE,
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
                ...appTerms(APP_BREAKDOWN_SIZE, false),
              },
            },
            ...appTerms(FAILING_APP_SIZE, true),
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
          aggs: {
            sessions: sessionCardinality,
            ...appTerms(FAILING_APP_SIZE, true),
          },
        },
        rumEsSearchOptions
      ),
      previousFilters
        ? client.search(
            {
              index: RUM_SESSION_SOURCE_INDEX,
              ignore_unavailable: true,
              allow_no_indices: true,
              size: 0,
              query: { bool: { filter: [...previousFilters, EXCEPTION_FILTER] } },
              aggs: {
                sessions: sessionCardinality,
                groups: {
                  terms: {
                    script: { source: ERROR_GROUP_SCRIPT, lang: 'painless' },
                    size: GROUP_SIZE,
                  },
                },
              },
            },
            rumEsSearchOptions
          )
        : Promise.resolve(null),
    ]);

    const previousByKey = previousCounts(
      (previous?.aggregations as { groups?: unknown } | undefined)?.groups
    );

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
        (parsed?.message && parsed.message.length > 0 ? parsed.message : '') ||
        exceptionMessageFromSource(source) ||
        (String(bucket.key).includes('|')
          ? String(bucket.key).slice(String(bucket.key).indexOf('|') + 1)
          : String(bucket.key));
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
      const key = String(bucket.key) || makeErrorGroupKey(type, message);
      const previousCount = previousByKey.get(key) ?? 0;
      const isNew = isNewInRange(firstSeenMs, bounds.from, bounds.to);
      const affectedApps = mergePreferOtelByName(
        namedCounts(bucket.otelApps),
        namedCounts(bucket.classicApps)
      );

      return {
        key,
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
        isNew,
        affectedPages: termsBuckets(bucket.pages)
          .map((page) => ({ path: String(page.key), count: page.doc_count }))
          .filter((page) => page.path.length > 0),
        samplePage: pageFromHit(source),
        sampleAction:
          attrString(source, 'user_action.name') ?? attrString(source, 'user_action.id'),
        sampleTraceId: traceIdFromHit(source),
        affectedApps,
        previousCount,
        pattern: classifyErrorPattern({ isNew, count: bucket.doc_count, previousCount }),
      };
    });

    const errorEvents = groups.reduce((sum, group) => sum + group.count, 0);
    const aggs = result.aggregations as
      | {
          sessions?: unknown;
          users?: { count?: { value?: number } };
          otelApps?: unknown;
          classicApps?: unknown;
        }
      | undefined;
    const sessionAggs = sessionTotal.aggregations as
      | { sessions?: unknown; otelApps?: unknown; classicApps?: unknown }
      | undefined;

    const topFailingApps: RumFailingApp[] = rumFailingApps(
      mergePreferOtelByName(failingRows(aggs?.otelApps), failingRows(aggs?.classicApps)),
      mergePreferOtelByName(
        sessionRows(sessionAggs?.otelApps),
        sessionRows(sessionAggs?.classicApps)
      )
    );

    const affectedAppNames = new Set(
      groups.flatMap((group) => group.affectedApps.map((app) => app.name))
    );
    const totalAppNames = new Set(topFailingApps.map((app) => app.name));
    for (const row of mergePreferOtelByName(
      sessionRows(sessionAggs?.otelApps),
      sessionRows(sessionAggs?.classicApps)
    )) {
      totalAppNames.add(row.name);
    }

    return {
      groups,
      total: errorEvents,
      topFailingApps,
      kpis: {
        errorEvents,
        impactedSessions: cardValue(aggs?.sessions),
        totalSessions: cardValue(sessionAggs?.sessions),
        impactedUsers: aggs?.users?.count?.value ?? 0,
        newGroups: groups.filter((group) => group.pattern === 'new').length,
        affectedApps: affectedAppNames.size,
        totalApps: totalAppNames.size,
        sharedGroups: groups.filter((group) => group.affectedApps.length > 1).length,
        previousErrorEvents: [...previousByKey.values()].reduce((sum, count) => sum + count, 0),
        previousImpactedSessions: cardValue(
          (previous?.aggregations as { sessions?: unknown } | undefined)?.sessions
        ),
      },
    };
  },
});
