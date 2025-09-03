/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { take } from 'lodash/fp';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { SearchPrivilegesIndicesRequestQuery } from '../../../../../common/api/entity_analytics/monitoring';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';

// Return a subset of all indices that contain the user.name field
const LIMIT = 20;

export const searchPrivilegeMonitoringIndicesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/privileges/indices',
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
          request: {
            query: buildRouteValidationWithZod(SearchPrivilegesIndicesRequestQuery),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const secSol = await context.securitySolution;
        const siemResponse = buildSiemResponse(response);
        const query = request.query.searchQuery;

        await assertAdvancedSettingsEnabled(
          await context.core,
          ENABLE_PRIVILEGED_USER_MONITORING_SETTING
        );

        try {
          const indices = await secSol
            .getPrivilegeMonitoringDataClient()
            .searchPrivilegesIndices(query);

          return response.ok({
            body: take(LIMIT, indices),
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error searching privilege monitoring indices: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
