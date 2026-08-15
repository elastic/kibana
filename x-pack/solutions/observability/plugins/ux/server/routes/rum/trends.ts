/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import type { RumTrendPoint } from '../../../common/rum_app';
import { rangeSpanMs } from '../../../common/rum_daily';
import { canUseSessionIndex } from '../../../common/rum_sessions';
import { getRumAnalyticsStatus } from '../../transforms/rum_sessions';
import { resolveRumDaily } from '../../transforms/rum_daily';
import { queryDailyOverview } from '../../transforms/rum_daily_query';
import { querySessionIndexTrends } from '../../transforms/rum_sessions_query';
import { rumEsSearchOptions } from './es_retry';
import {
  EXCEPTION_FILTER,
  PAGE_VIEW_FILTER,
  cardValue,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

const sessionIndexOpts = (
  installed: boolean,
  query: {
    analyticsMode?: string;
    rangeFrom?: string;
    rangeTo?: string;
    kuery?: string;
    connection?: string;
    device?: string;
    errorGroup?: string;
  },
  lookbackDays?: number
) =>
  canUseSessionIndex({
    installed,
    analyticsMode: query.analyticsMode,
    rangeMs: rangeSpanMs(query.rangeFrom, query.rangeTo),
    kuery: query.kuery,
    connection: query.connection,
    device: query.device,
    errorGroup: query.errorGroup,
    lookbackDays,
  });

export const getRumTrendsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/trends',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, params }): Promise<{ trends: RumTrendPoint[] }> => {
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;
    const status = await getRumAnalyticsStatus(client);
    const query = params.query;
    if (sessionIndexOpts(status.installed, query, status.sourceLookbackDays)) {
      return {
        trends: await querySessionIndexTrends({
          client,
          rangeFrom: query.rangeFrom || 'now-24h',
          rangeTo: query.rangeTo || 'now',
          watermark: status.watermark,
          serviceName: query.serviceName,
          browser: query.browser,
          os: query.os,
          location: query.location,
          pageUrl: query.pageUrl,
          user: query.user,
          frustration: query.frustration,
          breakpoint: query.breakpoint,
        }),
      };
    }

    const daily = resolveRumDaily({
      pagesDaily: status.pagesDaily,
      serviceDaily: status.serviceDaily,
      analyticsMode: query.analyticsMode,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      browser: query.browser,
      os: query.os,
      location: query.location,
      user: query.user,
      kuery: query.kuery,
      frustration: query.frustration,
      breakpoint: query.breakpoint,
      connection: query.connection,
      device: query.device,
      errorGroup: query.errorGroup,
    });
    if (daily.usePages || daily.useService) {
      const result = await queryDailyOverview({
        client,
        rangeFrom: query.rangeFrom || 'now-24h',
        rangeTo: query.rangeTo || 'now',
        serviceName: query.serviceName,
        pageUrl: query.pageUrl,
        usePages: daily.usePages,
        useService: daily.useService,
        pagesWatermark: status.pagesDaily?.watermark,
        serviceWatermark: status.serviceDaily?.watermark,
      });
      return { trends: result.trends };
    }

    const result = await client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: rumBaseFilters(query) } },
        aggs: {
          trends: {
            auto_date_histogram: { field: '@timestamp', buckets: 24 },
            aggs: {
              sessions: sessionCardinality,
              page_views: { filter: PAGE_VIEW_FILTER },
              errors: { filter: EXCEPTION_FILTER },
            },
          },
        },
      },
      rumEsSearchOptions
    );
    return {
      trends: termsBuckets((result.aggregations as { trends?: unknown } | undefined)?.trends).map(
        (bucket) => ({
          timestamp:
            (bucket as { key_as_string?: string }).key_as_string ??
            new Date(Number(bucket.key)).toISOString(),
          sessions: cardValue(bucket.sessions),
          pageViews: (bucket.page_views as { doc_count?: number } | undefined)?.doc_count ?? 0,
          errors: (bucket.errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
        })
      ),
    };
  },
});
