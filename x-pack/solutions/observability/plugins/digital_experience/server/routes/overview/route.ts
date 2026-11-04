/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { OVERVIEW_FILTER_MAX_LENGTHS } from '../../../common/overview_filters';
import type { ApplicationOverviewResponse } from '../../../common/types/overview';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import { MAX_SERVICE_NAME_LENGTH } from '../../lib/constants';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { START_AFTER_END_ISSUE, isStartBeforeEnd, timeRangeShape } from '../params';
import { getOtelOverview } from './otel/get_otel_overview';

export const APPLICATION_OVERVIEW_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/overview';

/** The Overview route, keyed by its endpoint; `plugin.ts` registers it. */
export const overviewRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_OVERVIEW_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().min(1).max(MAX_SERVICE_NAME_LENGTH),
      }),
      query: z
        .object({
          ...timeRangeShape(),
          // Each narrows the Overview to one value; all values when left out.
          browser: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.browser).optional(),
          os: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.os).optional(),
          device: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.device).optional(),
          country: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.country).optional(),
          pageUrl: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.pageUrl).optional(),
        })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({ params, context, request }): Promise<ApplicationOverviewResponse> => {
    const { serviceName } = params.path;
    const { environment, browser, os, device, country, pageUrl } = params.query;
    const start = Date.parse(params.query.start);
    const end = Date.parse(params.query.end);

    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;
    const signal = getRequestAbortedSignal(request.events.aborted$);

    return getOtelOverview({
      esClient,
      serviceName,
      start,
      end,
      environment,
      filters: { browser, os, device, country, pageUrl },
      signal,
    });
  },
});
