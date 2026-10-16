/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { ENABLE_LEAD_GENERATION_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { enableLeadGenerationRequestSchema } from '../../../../../common/entity_analytics/lead_generation/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { startLeadGenerationTask } from '../tasks';
import { createLeadIndexService } from '../indices/lead_index_service';
import { upsertLeadGenerationConfig } from '../saved_object';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const enableLeadGenerationRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENABLE_LEAD_GENERATION_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(enableLeadGenerationRequestSchema),
          },
        },
      },

      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const coreCtx = await context.core;
          const internalEsClient = coreCtx.elasticsearch.client.asInternalUser;
          const soClient = coreCtx.savedObjects.client;

          const [, startPlugins] = await getStartServices();
          const taskManager = startPlugins.taskManager;
          if (!taskManager) {
            return siemResponse.error({
              statusCode: 500,
              body: 'Task Manager is not available',
            });
          }

          const { connectorId } = request.body;
          await upsertLeadGenerationConfig(soClient, spaceId, { connectorId });

          // The leads index is shared, per-space infrastructure rather than per-user data, so
          // provisioning it shouldn't depend on the requesting user's own `create_index`/`manage` privileges
          const indexService = createLeadIndexService({
            esClient: internalEsClient,
            logger,
            spaceId,
          });
          await indexService.createIndex();

          await startLeadGenerationTask({ taskManager, logger, namespace: spaceId, request });

          logger.info(`[LeadGeneration] Enabled scheduled lead generation for space "${spaceId}"`);
          return response.ok({ body: { success: true } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error enabling lead generation: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      })
    );
};
