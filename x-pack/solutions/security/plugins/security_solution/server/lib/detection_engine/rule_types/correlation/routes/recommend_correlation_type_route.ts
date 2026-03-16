/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { recommendCorrelationType } from '../recommend_correlation_type';

const RECOMMEND_CORRELATION_TYPE_URL =
  '/internal/security_solution/correlation/recommend_type' as const;

const RecommendCorrelationTypeRequestBody = z.object({
  rules: z.array(z.string()).min(1),
  groupByFields: z.array(z.string()).min(1),
  timespan: z.string().regex(/^\d+[smhd]$/),
});

export const recommendCorrelationTypeRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: RECOMMEND_CORRELATION_TYPE_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RecommendCorrelationTypeRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const spaceId = (await context.securitySolution).getSpaceId();
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const result = await recommendCorrelationType(esClient, {
          rules: request.body.rules,
          groupByFields: request.body.groupByFields,
          timespan: request.body.timespan,
          spaceId,
        });

        return response.ok({ body: result });
      }
    );
};
