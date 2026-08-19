/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { parseRumSessionTraffic } from '../../common/rum_apps';
import { rumAppsSpanFromPoints, type RumAppsSpanResponse } from '../../common/rum_span';
import {
  RUM_CANONICAL_SESSION_ID_FIELD,
  RUM_SESSIONS_INDEX,
  sessionsSourceLookback,
} from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import { PAGE_VIEW_FILTER, rumBaseFilters, sessionCardinality } from '../routes/rum/query';
import { sessionIndexTimeFilter } from './rum_sessions_query';

const SPAN_BUCKETS = 72;

const parseRangeMs = (rangeFrom?: string, rangeTo?: string): { fromMs: number; toMs: number } => {
  const from = dateMath.parse(rangeFrom || 'now-24h');
  const to = dateMath.parse(rangeTo || 'now', { roundUp: true });
  const fromMs = from?.isValid() ? from.valueOf() : Date.now() - 24 * 60 * 60 * 1000;
  const toMs = to?.isValid() ? to.valueOf() : Date.now();
  return { fromMs, toMs };
};

export const queryRumAppsSpan = async ({
  client,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
  useIndex,
  watermark,
  lookbackDays,
}: {
  client: ElasticsearchClient;
  rangeFrom?: string;
  rangeTo?: string;
  includeBots?: string;
  botUa?: string;
  useIndex?: boolean;
  watermark?: string | null;
  lookbackDays?: number;
}): Promise<RumAppsSpanResponse> => {
  const currentFrom = rangeFrom || 'now-24h';
  const currentTo = rangeTo || 'now';
  const { fromMs, toMs } = parseRangeMs(currentFrom, currentTo);
  const lookbackGte = sessionsSourceLookback(lookbackDays);

  if (useIndex && watermark) {
    const result = await client.search(
      {
        index: RUM_SESSIONS_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: {
          bool: {
            filter: [sessionIndexTimeFilter(lookbackGte, currentTo, watermark)],
          },
        },
        aggs: {
          sessionTraffic: {
            auto_date_histogram: { field: 'start_time', buckets: SPAN_BUCKETS },
          },
        },
      },
      rumEsSearchOptions
    );
    const points = parseRumSessionTraffic(
      (result.aggregations as { sessionTraffic?: unknown } | undefined)?.sessionTraffic
    );
    return rumAppsSpanFromPoints(points, fromMs, toMs);
  }

  const result = await client.search(
    {
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rumBaseFilters({
              rangeFrom: lookbackGte,
              rangeTo: currentTo,
              includeBots,
              botUa,
            }),
            {
              bool: {
                should: [PAGE_VIEW_FILTER, { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        sessionTraffic: {
          auto_date_histogram: { field: '@timestamp', buckets: SPAN_BUCKETS },
          aggs: { sessions: sessionCardinality },
        },
      },
    },
    rumEsSearchOptions
  );
  const points = parseRumSessionTraffic(
    (result.aggregations as { sessionTraffic?: unknown } | undefined)?.sessionTraffic
  );
  return rumAppsSpanFromPoints(points, fromMs, toMs);
};
