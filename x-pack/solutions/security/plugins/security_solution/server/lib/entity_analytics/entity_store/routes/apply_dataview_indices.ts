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

export const applyDataViewIndicesEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/apply_dataview_indices',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
        },
      },

      async (
        context,
        _,
        response
      ): Promise<IKibanaResponse<ApplyEntityEngineDataviewIndicesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const { errors, successes } = await secSol
            .getEntityStoreDataClient()
            .applyDataViewIndices();

          const errorMessages = errors.map((e) => e.message);

          if (successes.length === 0 && errors.length > 0) {
            return siemResponse.error({
              statusCode: 500,
              body: `Error in ApplyEntityEngineDataViewIndices. Errors: [${errorMessages.join(
                ', '
              )}]`,
            });
          }

          if (errors.length === 0) {
            return response.ok({
              body: {
                success: true,
                result: successes,
              },
            });
          } else {
            return response.multiStatus({
              body: {
                success: false,
                errors: errorMessages,
                result: successes,
              },
            });
          }
        } catch (e) {
          logger.error('Error in ApplyEntityEngineDataViewIndices:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
