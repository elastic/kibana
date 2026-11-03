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
import {
  overlaySessionTrendSessions,
  sessionIndexParamsFromQuery,
} from '../../transforms/rum_sessions_query';
import { rumEsSearchOptions } from './es_retry';
import { getRumSearchClient } from '../../lib/rum_search_client';
import {
  EXCEPTION_FILTER,
  PAGE_VIEW_FILTER,
  cardValue,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

export const getRumTrendsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/trends',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, core, params, request }): Promise<{ trends: RumTrendPoint[] }> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const status = await getRumAnalyticsStatus(elasticsearch.client.asInternalUser);
    const query = params.query;
    const daily = resolveRumDaily({
      pagesDaily: status.pagesDaily,
      serviceDaily: status.serviceDaily,
      browserDaily: status.browserDaily,
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
      pageUrl: query.pageUrl,
    });
    const useSessionTrends = canUseSessionIndex({
      installed: status.installed,
      analyticsMode: query.analyticsMode,
      rangeMs: rangeSpanMs(query.rangeFrom, query.rangeTo),
      kuery: query.kuery,
      lookbackDays: status.sourceLookbackDays,
    });
    const withSessionSessions = async (
      trends: RumTrendPoint[],
      align: '1d' | '1h'
    ): Promise<{ trends: RumTrendPoint[] }> => {
      if (!useSessionTrends) {
        return { trends };
      }
      return {
        trends: await overlaySessionTrendSessions({
          client,
          trends,
          align,
          ...sessionIndexParamsFromQuery(query, status.watermark),
        }),
      };
    };
    if (daily.usePages || daily.useService || daily.useBrowser) {
      const result = await queryDailyOverview({
        client,
        rangeFrom: query.rangeFrom || 'now-24h',
        rangeTo: query.rangeTo || 'now',
        serviceName: query.serviceName,
        pageUrl: query.pageUrl,
        browser: query.browser,
        usePages: daily.usePages,
        useService: daily.useService,
        useBrowser: daily.useBrowser,
        pagesWatermark: status.pagesDaily?.watermark,
        serviceWatermark: status.serviceDaily?.watermark,
        browserWatermark: status.browserDaily?.watermark,
      });
      return withSessionSessions(result.trends, '1d');
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
    return withSessionSessions(
      termsBuckets((result.aggregations as { trends?: unknown } | undefined)?.trends).map(
        (bucket) => ({
          timestamp:
            (bucket as { key_as_string?: string }).key_as_string ??
            new Date(Number(bucket.key)).toISOString(),
          sessions: cardValue(bucket.sessions),
          pageViews: (bucket.page_views as { doc_count?: number } | undefined)?.doc_count ?? 0,
          errors: (bucket.errors as { doc_count?: number } | undefined)?.doc_count ?? 0,
        })
      ),
      '1h'
    );
  },
});
