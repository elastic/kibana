/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { START_AFTER_END_ISSUE, isStartBeforeEnd, timeRangeShape } from '../params';
import { getMobileKpis } from './get_mobile_kpis';

export const MOBILE_KPIS_ENDPOINT =
  'GET /internal/digital_experience/mobile_applications/{serviceName}/kpis';

const MAX_NAME_LENGTH = 1024;

/** The KPI row of the mobile application page. */
export const mobileRouteRepository = createDigitalExperienceServerRoute({
  endpoint: MOBILE_KPIS_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().min(1).max(MAX_NAME_LENGTH) }),
      query: z
        .object({
          ...timeRangeShape(),
          platform: z.enum(['android', 'ios']).optional(),
          release: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
        })
        .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
    })
  ),
  handler: async ({ params, context, request }): Promise<MobileKpisResponse> => {
    const { elasticsearch } = await context.core;
    const { serviceName } = params.path;
    const { start, end, environment, platform, release } = params.query;
    return getMobileKpis({
      esClient: elasticsearch.client.asCurrentUser,
      filters: { serviceName, platform, release },
      start: Date.parse(start),
      end: Date.parse(end),
      environment,
      signal: getRequestAbortedSignal(request.events.aborted$),
    });
  },
});
