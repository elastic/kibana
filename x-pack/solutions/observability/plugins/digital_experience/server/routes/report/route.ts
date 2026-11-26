/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import type { ScorecardReport } from '../../../common/types/scorecard';
import { MAX_SERVICE_NAME_LENGTH } from '../../lib/constants';
import { getScorecardReport } from '../../lib/report/get_scorecard_report';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { timeRangeQuery } from '../params';

export const APPLICATION_SCORECARD_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/report/scorecard' as const;

/** The scorecard report route, keyed by its endpoint; `plugin.ts` registers it. */
export const reportRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_SCORECARD_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().min(1).max(MAX_SERVICE_NAME_LENGTH),
      }),
      // The scorecard covers the whole application, so there are no filters to narrow it.
      query: timeRangeQuery(),
    })
  ),
  handler: async ({ params, context, request, logger }): Promise<ScorecardReport> => {
    const { serviceName } = params.path;
    const { environment } = params.query;

    const { elasticsearch } = await context.core;
    return getScorecardReport({
      client: elasticsearch.client.asCurrentUser,
      logger,
      serviceName,
      start: Date.parse(params.query.start),
      end: Date.parse(params.query.end),
      environment,
      signal: getRequestAbortedSignal(request.events.aborted$),
    });
  },
});
