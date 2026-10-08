/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_GRID_CASES_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { CASE_ATTACHMENT_TYPE, canReadSecurityCases, fetchCaseCounts } from './columns/cases';

export const registerEntityGridCasesRoute = ({
  router,
  logger: rootLogger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  const logger = rootLogger.get('entityAnalytics.entityTable.cases');
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_GRID_CASES_INTERNAL_URL,
      security: {
        authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(
              z.object({ entity_ids: z.array(z.string().max(500)).max(100) })
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [coreStart, { security }] = await getStartServices();
          // Without access to Security cases, the user sees no case counts.
          if (!(await canReadSecurityCases(security, request))) return response.ok({ body: {} });

          const spaceId = (await context.securitySolution).getSpaceId();
          const repository = coreStart.savedObjects.createInternalRepository([
            CASE_ATTACHMENT_TYPE,
          ]);
          const counts = await fetchCaseCounts(repository, spaceId, request.body.entity_ids);
          return response.ok({ body: Object.fromEntries(counts) });
        } catch (err) {
          logger.error(`Failed to count cases of entities: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
