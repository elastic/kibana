/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../timeline/utils/common';
import { getDashboardsRequest } from '../../../../common/api/tags';
import { buildRouteValidationWithExcess } from '../../../utils/build_validation/route_validation';

export const getDashboardsByTagsRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      path: INTERNAL_DASHBOARDS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithExcess(getDashboardsRequest) } },
      },
      async (context, request, response) => {
        const frameworkRequest = await buildFrameworkRequest(context, request);
        const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;
        const { tagIds } = request.body;

        try {
          const dashboardsResponse = await savedObjectsClient.find<DashboardSavedObjectAttributes>({
            type: 'dashboard',
            hasReference: tagIds.map((id) => ({ id, type: 'tag' })),
          });
          const dashboards = dashboardsResponse.saved_objects ?? [];

          return response.ok({ body: dashboards });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to find dashboards tags - ${JSON.stringify(error.message)}`);

          const siemResponse = buildSiemResponse(response);
          return siemResponse.error({
            statusCode: error.statusCode ?? 500,
            body: i18n.translate(
              'xpack.securitySolution.dashboards.getSecuritySolutionDashboardsErrorTitle',
              {
                values: { message: error.message },
                defaultMessage: `Failed to find dashboards - {message}`,
              }
            ),
          });
        }
      }
    );
};
