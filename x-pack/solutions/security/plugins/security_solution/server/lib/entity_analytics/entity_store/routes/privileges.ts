/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { EntityStoreGetPrivilegesResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/get_privileges.gen';
import { ENTITY_STORE_INTERNAL_PRIVILEGES_URL } from '../../../../../common/entity_analytics/entity_store/constants';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { getEntityStorePrivileges } from '../utils/get_entity_store_privileges';
import { buildIndexPatterns } from '../utils';

export const entityStoreInternalPrivilegesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ENTITY_STORE_INTERNAL_PRIVILEGES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<EntityStoreGetPrivilegesResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [_, { security }] = await getStartServices();
          const { getSpaceId, getAppClient, getDataViewsService } = await context.securitySolution;

          const securitySolution = await context.securitySolution;
          securitySolution.getAuditLogger()?.log({
            message: 'User checked if they have the required privileges to use the Entity Store',
            event: {
              action: `entity_store_privilege_get`,
              category: AUDIT_CATEGORY.AUTHENTICATION,
              type: AUDIT_TYPE.ACCESS,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          const securitySolutionIndices = await buildIndexPatterns(
            getSpaceId(),
            getAppClient(),
            getDataViewsService()
          );
          const body = await getEntityStorePrivileges(request, security, securitySolutionIndices);

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
