/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import {
  ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH,
  relatedAlertsRequestSchema,
} from '../../../../common/api/alert_analysis/related_alerts';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { findRelatedAlerts } from '../services/find_related_alerts';

export const registerAlertAnalysisRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH,
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
        validate: {
          request: {
            body: buildRouteValidationWithZod(relatedAlertsRequestSchema),
          },
        },
      },
      async (context, request, response) => {
        const [coreContext, securitySolutionContext] = await Promise.all([
          context.core,
          context.securitySolution,
        ]);
        const spaceId = securitySolutionContext.getSpaceId();
        const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

        const result = await findRelatedAlerts(coreContext.elasticsearch.client.asCurrentUser, {
          alertId: request.body.alertId,
          alertsIndex,
          timeWindowHours: request.body.timeWindowHours,
          maxResults: request.body.maxResults,
          hostNames: request.body.hostNames,
          userNames: request.body.userNames,
          sourceIps: request.body.sourceIps,
          destIps: request.body.destIps,
          logger,
        });

        if (!result.ok) {
          const statusCode = result.reason === 'alert_not_found' ? 404 : 500;
          return response.customError({
            statusCode,
            body: { message: result.message },
          });
        }

        return response.ok({
          body: result,
        });
      }
    );
};
