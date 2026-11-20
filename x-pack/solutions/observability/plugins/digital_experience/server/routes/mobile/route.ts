/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { createDigitalExperienceTracedEsClient } from '../../lib/create_digital_experience_traced_es_client';
import { MAX_OS_NAME_LENGTH, MAX_RELEASE_LENGTH } from '../../lib/constants';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import {
  START_AFTER_END_ISSUE,
  isStartBeforeEnd,
  serviceNameParam,
  timeRangeShape,
} from '../params';
import { getMobileKpis } from './get_mobile_kpis';

export const MOBILE_KPIS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/kpis';

/** The KPI row of the mobile application page. */
export const mobileRouteRepository = createDigitalExperienceServerRoute({
  endpoint: MOBILE_KPIS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: serviceNameParam() }),
      query: z
        .object({
          ...timeRangeShape(),
          osName: z.string().min(1).max(MAX_OS_NAME_LENGTH).optional(),
          release: z.string().min(1).max(MAX_RELEASE_LENGTH).optional(),
        })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({ params, context, request, logger }): Promise<MobileKpisResponse> => {
    const { elasticsearch } = await context.core;
    const { serviceName } = params.path;
    const { start, end, environment, osName, release } = params.query;
    return getMobileKpis({
      esClient: createDigitalExperienceTracedEsClient({
        client: elasticsearch.client.asCurrentUser,
        logger,
        abortSignal: getRequestAbortedSignal(request.events.aborted$),
      }),
      filters: { serviceName, osName, release },
      start: Date.parse(start),
      end: Date.parse(end),
      environment,
    });
  },
});
