/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { RumAppsQueryStage, RumAppsResponse } from '../../../common/rum_apps';
import type { RumAppsSpanResponse } from '../../../common/rum_span';
import { canUseSessionIndex } from '../../../common/rum_sessions';
import { rangeSpanMs } from '../../../common/rum_daily';
import { queryRumApps } from '../../transforms/rum_apps_query';
import { queryRumAppsSpan } from '../../transforms/rum_apps_span';
import { resolveRumAnalytics } from '../../transforms/rum_sessions';
import { createUxServerRoute } from '../create_ux_server_route';
import { boundedString } from './query';
import { getRumSearchClient } from '../../lib/rum_search_client';

const isAppsStage = (value: string | undefined): value is RumAppsQueryStage =>
  value === 'index' || value === 'remainder';

export const getRumAppsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/apps',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.partial({
      rangeFrom: boundedString(64),
      rangeTo: boundedString(64),
      includeBots: boundedString(8),
      botUa: boundedString(512),
      analyticsMode: boundedString(16),
      stage: boundedString(16),
    }),
  }),
  handler: async ({ context, core, params, request }): Promise<RumAppsResponse> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const { rangeFrom, rangeTo, includeBots, botUa, analyticsMode, stage } = params.query;
    const analytics = await resolveRumAnalytics(elasticsearch.client.asInternalUser, {
      analyticsMode,
      rangeTo,
    });
    const useIndex =
      analytics.useIndex &&
      canUseSessionIndex({
        installed: analytics.status.installed,
        analyticsMode,
        rangeMs: rangeSpanMs(rangeFrom, rangeTo),
        lookbackDays: analytics.status.sourceLookbackDays,
      });
    return queryRumApps({
      client,
      rangeFrom,
      rangeTo,
      includeBots,
      botUa,
      request,
      stage: isAppsStage(stage) ? stage : undefined,
      useIndex,
      mergeRaw: useIndex && analytics.mergeRaw,
      watermark: analytics.status.watermark,
    });
  },
});

export const getRumAppsSpanRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/apps/span',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    query: t.partial({
      rangeFrom: boundedString(64),
      rangeTo: boundedString(64),
      includeBots: boundedString(8),
      botUa: boundedString(512),
      analyticsMode: boundedString(16),
    }),
  }),
  handler: async ({ context, core, params, request }): Promise<RumAppsSpanResponse> => {
    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const { rangeFrom, rangeTo, includeBots, botUa, analyticsMode } = params.query;
    const analytics = await resolveRumAnalytics(elasticsearch.client.asInternalUser, {
      analyticsMode,
      rangeTo,
    });
    return queryRumAppsSpan({
      client,
      rangeFrom,
      rangeTo,
      includeBots,
      botUa,
      useIndex: analytics.useIndex,
      watermark: analytics.status.watermark,
      lookbackDays: analytics.status.sourceLookbackDays,
    });
  },
});
