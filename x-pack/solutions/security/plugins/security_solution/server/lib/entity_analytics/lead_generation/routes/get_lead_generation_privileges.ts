/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  LEAD_GENERATION_PRIVILEGES_URL,
  LEADS_INDEX_PATTERN,
} from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import {
  _formatPrivileges,
  hasReadWritePermissions,
} from '../../utils/check_and_format_privileges';

export const getLeadGenerationPrivilegesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      access: 'internal',
      path: LEAD_GENERATION_PRIVILEGES_URL,
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
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [_, { security }] = await getStartServices();

          const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
          const { privileges, hasAllRequested } = await checkPrivileges({
            elasticsearch: {
              cluster: [],
              index: { [LEADS_INDEX_PATTERN]: ['read', 'write'] },
            },
          });

          const body = {
            privileges: _formatPrivileges(privileges),
            has_all_required: hasAllRequested,
            ...hasReadWritePermissions(privileges.elasticsearch, LEADS_INDEX_PATTERN),
          };

          return response.ok({ body });
        } catch (e) {
          logger.error(`[LeadGeneration] Error checking privileges: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
