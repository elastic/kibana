/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CORRELATION_RUNS_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../../lib/space_filter';
import { createRunDataClient } from '../run_data_client';
import type { RouteRegistrationDeps } from '../../routes';

export const registerListCorrelationRunsRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: CORRELATION_RUNS_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.correlate],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({
              page: schema.maybe(schema.number({ min: 1 })),
              per_page: schema.maybe(schema.number({ min: 1, max: 100 })),
              report_id: schema.maybe(schema.string({ minLength: 1 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        const {
          page,
          per_page: perPage,
          report_id: reportId,
        } = request.query as {
          page?: number;
          per_page?: number;
          report_id?: string;
        };

        const core = await context.core;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const esClient = core.elasticsearch.client.asCurrentUser;

        const runDataClient = createRunDataClient({ esClient, logger, spaceId });

        try {
          const result = await runDataClient.listRuns({ page, perPage, reportId });
          return response.ok({ body: result });
        } catch (e) {
          logger.error(`[CorrelationRuns] listRuns failed: ${e}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list correlation runs' },
          });
        }
      }
    );
};
