/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { FIND_SESSION_ID_FIELDS, sessionIdTermsFilter } from '../../common/session_find';
import {
  RUM_SESSION_SOURCE_INDEX,
  type RumSessionSummary,
  type SessionActivityBucket,
} from '../../common/session_replay';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import {
  buildSparkline,
  pagePathFromAnyHits,
  type OtelHit,
} from '../routes/session_replay/session_attributes';

const SPARKLINE_SAMPLE_SIZE = 100;

const SPARKLINE_SOURCE = ['@timestamp', 'name', 'event_name', 'attributes', 'resource.attributes'];

interface SparklineBucket {
  sample?: { hits?: { hits?: OtelHit[] } };
}

export const sessionSparklineNamedFilters = (ids: string[]): Record<string, object> =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      {
        bool: {
          should: FIND_SESSION_ID_FIELDS.map((field) => ({ term: { [field]: id } })),
          minimum_should_match: 1,
        },
      },
    ])
  );

export const sparklineTimeRange = (
  sessions: Array<Pick<RumSessionSummary, 'startTime' | 'endTime'>>
): { gte: string; lte: string } | undefined => {
  let gteMs: number | undefined;
  let lteMs: number | undefined;
  for (const session of sessions) {
    const start = session.startTime ? Date.parse(session.startTime) : NaN;
    const end = session.endTime ? Date.parse(session.endTime) : NaN;
    if (Number.isFinite(start)) {
      gteMs = gteMs == null ? start : Math.min(gteMs, start);
    }
    if (Number.isFinite(end)) {
      lteMs = lteMs == null ? end : Math.max(lteMs, end);
    }
  }
  if (gteMs == null) {
    return undefined;
  }
  return {
    gte: new Date(gteMs).toISOString(),
    lte: new Date(lteMs ?? gteMs).toISOString(),
  };
};

export const sparklinesFromFilterBuckets = (
  buckets: Record<string, SparklineBucket> | undefined,
  sessions: Array<Pick<RumSessionSummary, 'sessionId' | 'startTime' | 'endTime'>>
): Map<string, SessionActivityBucket[]> => {
  const out = new Map<string, SessionActivityBucket[]>();
  for (const session of sessions) {
    const hits = buckets?.[session.sessionId]?.sample?.hits?.hits ?? [];
    if (hits.length === 0) {
      continue;
    }
    const startMs = session.startTime ? Date.parse(session.startTime) : 0;
    const parsedEnd = session.endTime ? Date.parse(session.endTime) : NaN;
    const endMs = Number.isFinite(parsedEnd) ? parsedEnd : startMs + 1;
    out.set(session.sessionId, buildSparkline(hits, startMs, Math.max(endMs, startMs + 1)));
  }
  return out;
};

/** Sample source events for the current dest page and attach sparklines. */
export const fillSessionListSparklines = async (
  client: ElasticsearchClient,
  sessions: RumSessionSummary[]
): Promise<RumSessionSummary[]> => {
  const ids = sessions.map((session) => session.sessionId).filter(Boolean);
  if (ids.length === 0) {
    return sessions;
  }

  const filters: object[] = [sessionIdTermsFilter(ids)];
  const timeRange = sparklineTimeRange(sessions);
  if (timeRange) {
    filters.push({ range: { '@timestamp': timeRange } });
  }

  try {
    const result = await client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: filters } },
        aggs: {
          sessions: {
            filters: { filters: sessionSparklineNamedFilters(ids) },
            aggs: {
              sample: {
                top_hits: {
                  size: SPARKLINE_SAMPLE_SIZE,
                  sort: [{ '@timestamp': 'asc' as const }],
                  _source: SPARKLINE_SOURCE,
                },
              },
            },
          },
        },
      },
      rumEsSearchOptions
    );
    const buckets = (
      result.aggregations as { sessions?: { buckets?: Record<string, SparklineBucket> } }
    )?.sessions?.buckets;
    const sparklines = sparklinesFromFilterBuckets(buckets, sessions);
    return sessions.map((session) => {
      const hits = buckets?.[session.sessionId]?.sample?.hits?.hits ?? [];
      const sparkline = sparklines.get(session.sessionId);
      const pagePath = session.pagePath.length > 0 ? session.pagePath : pagePathFromAnyHits(hits);
      const entryPage = session.entryPage ?? pagePath[0] ?? null;
      const exitPage =
        session.exitPage ?? (pagePath.length > 0 ? pagePath[pagePath.length - 1]! : null);
      return {
        ...session,
        pagePath,
        entryPage,
        exitPage,
        ...(sparkline ? { sparkline } : {}),
      };
    });
  } catch {
    return sessions;
  }
};
