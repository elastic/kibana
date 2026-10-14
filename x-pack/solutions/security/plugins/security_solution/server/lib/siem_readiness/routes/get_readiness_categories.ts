/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_CATEGORIES_API_PATH } from '@kbn/siem-readiness';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchCategories } from '../fetchers';
import { assertSiemReadinessEnabled } from '../assert_siem_readiness_enabled';

export const getReadinessCategoriesRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_CATEGORIES_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;

          const disabledResponse = await assertSiemReadinessEnabled(
            core.uiSettings.client,
            response
          );
          if (disabledResponse) {
            return disabledResponse;
          }

          const esClient = core.elasticsearch.client.asCurrentUser;

          const categoriesResponse = await fetchCategories({ esClient, logger });

          return response.ok({ body: categoriesResponse });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness categories: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
