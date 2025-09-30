/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { CreatePrivilegesImportIndexRequestBody } from '../../../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
  PRIVMON_INDICES_URL,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import { createDataSourcesService } from '../data_sources/data_sources_service';
import { PrivilegeMonitoringApiKeyType } from '../auth/saved_object';
import { monitoringEntitySourceType } from '../saved_objects';

export const createPrivilegeMonitoringIndicesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .put({
      access: 'public',
      path: PRIVMON_INDICES_URL,
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
            body: buildRouteValidationWithZod(CreatePrivilegesImportIndexRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const secSol = await context.securitySolution;
        const siemResponse = buildSiemResponse(response);
        const indexName = request.body.name;
        const indexMode = request.body.mode;

        await assertAdvancedSettingsEnabled(
          await context.core,
          ENABLE_PRIVILEGED_USER_MONITORING_SETTING
        );

        const dataClient = secSol.getPrivilegeMonitoringDataClient();
        const soClient = dataClient.getScopedSoClient(request, {
          includedHiddenTypes: [
            PrivilegeMonitoringApiKeyType.name,
            monitoringEntitySourceType.name,
          ],
        });
        const dataSourcesService = createDataSourcesService(dataClient, soClient);
        try {
          await dataSourcesService.createImportIndex(indexName, indexMode);
          return response.ok();
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating privilege monitoring indices: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
