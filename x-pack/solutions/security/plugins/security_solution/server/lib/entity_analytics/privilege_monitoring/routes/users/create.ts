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
  CreatePrivMonUserRequestBody,
  type CreatePrivMonUserResponse,
} from '../../../../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
  MONITORING_USERS_URL,
} from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { assertAdvancedSettingsEnabled } from '../../../utils/assert_advanced_setting_enabled';
import { createPrivilegedUsersCrudService } from '../../users/privileged_users_crud';

export const createUserRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .post({
      access: 'public',
      path: MONITORING_USERS_URL,
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
            body: CreatePrivMonUserRequestBody,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreatePrivMonUserResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          await assertAdvancedSettingsEnabled(
            await context.core,
            ENABLE_PRIVILEGED_USER_MONITORING_SETTING
          );
          const secSol = await context.securitySolution;
          const dataClient = secSol.getPrivilegeMonitoringDataClient();
          const config = secSol.getConfig();
          const maxUsersAllowed =
            config.entityAnalytics.monitoring.privileges.users.maxPrivilegedUsersAllowed;
          const crudService = createPrivilegedUsersCrudService(dataClient);

          const body = await crudService.create(request.body, 'api', maxUsersAllowed);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating user: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
