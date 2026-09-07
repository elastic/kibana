/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ApplyEntityEngineDataviewIndicesResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/apply_dataview_indices.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import {
  getAllMissingPrivileges,
  getMissingPrivilegesErrorMessage,
} from '../../../../../common/entity_analytics/privileges';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../telemetry/event_based/events';

export const applyDataViewIndicesEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/entity_store/engines/apply_dataview_indices',
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
          request: {},
        },
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ApplyEntityEngineDataviewIndicesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const entityStoreClient = secSol.getEntityStoreDataClient();

          // Applying data view indices reconfigures and regenerates the entity discovery
          // resources (transforms, ingest pipelines) and mints an API key, so it requires the
          // same Elasticsearch privileges as initializing the entity store. The Kibana feature
          // privilege alone does not gate this, so enforce the init privileges explicitly.
          const privileges = await entityStoreClient.getEntityStoreInitPrivileges([]);
          if (!privileges.has_all_required) {
            return siemResponse.error({
              statusCode: 403,
              body: `User does not have the required privileges to apply data view indices to the entity store\n${getMissingPrivilegesErrorMessage(
                getAllMissingPrivileges(privileges)
              )}`,
            });
          }

          const { errors, successes } = await entityStoreClient.applyDataViewIndices();

          const errorMessages = errors.map((e) => e.message);

          if (successes.length === 0 && errors.length > 0) {
            return siemResponse.error({
              statusCode: 500,
              body: `Errors applying data view changes to the entity store. Errors: \n${errorMessages.join(
                '\n\n'
              )}`,
            });
          }

          const apiKeyManager = secSol.getEntityStoreApiKeyManager();
          await apiKeyManager.generate();

          if (errors.length === 0) {
            telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
              endpoint: request.route.path,
            });
            return response.ok({
              body: {
                success: true,
                result: successes,
              },
            });
          } else {
            telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
              endpoint: request.route.path,
              error: errorMessages.join('; '),
            });
            return response.multiStatus({
              body: {
                success: false,
                errors: errorMessages,
                result: successes,
              },
            });
          }
        } catch (e) {
          logger.error(`Error in ApplyEntityEngineDataViewIndices: ${e.message}`);
          const error = transformError(e);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: error.message,
          });
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
