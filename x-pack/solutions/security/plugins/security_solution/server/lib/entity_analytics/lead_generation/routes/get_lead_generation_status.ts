/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { LEAD_GENERATION_STATUS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { createLeadDataClient } from '../lead_data_client';
import { getLeadGenerationTaskId } from '../tasks';
import { getLeadGenerationConfig } from '../saved_object';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const getLeadGenerationStatusRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .get({
      access: 'internal',
      path: LEAD_GENERATION_STATUS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },

      withMinimumLicense(async (context, _request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const coreCtx = await context.core;
          const esClient = coreCtx.elasticsearch.client.asCurrentUser;
          const soClient = coreCtx.savedObjects.client;

          let isEnabled = false;
          try {
            const [, startPlugins] = await getStartServices();
            const taskManager = startPlugins.taskManager;
            if (taskManager) {
              const taskId = getLeadGenerationTaskId(spaceId);
              await taskManager.get(taskId);
              isEnabled = true;
            }
          } catch {
            isEnabled = false;
          }

          const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });
          const status = await leadDataClient.getStatus({ isEnabled });
          const config = await getLeadGenerationConfig(soClient, spaceId);

          return response.ok({
            body: {
              ...status,
              connectorId: config?.connectorId,
              lastExecutionUuid: config?.lastExecutionUuid,
              lastError: config?.lastError ?? null,
            },
          });
        } catch (e) {
          logger.error(`[LeadGeneration] Error fetching status: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      })
    );
};
