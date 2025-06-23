/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { schema } from '@kbn/config-schema';
import { PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE } from '../../../../../../common/entity_analytics/privileged_user_monitoring/constants';
import type { HapiReadableStream } from '../../../../../types';
import type { ConfigType } from '../../../../../config';
import type { PrivmonBulkUploadUsersCSVResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/upload_csv.gen';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { checkAndInitPrivilegedMonitoringResources } from '../../check_and_init_prvileged_monitoring_resources';

export const uploadUsersCSVRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: ConfigType
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/monitoring/users/_csv',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        body: {
          output: 'stream',
          accepts: 'multipart/form-data',
          maxBytes: PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: schema.object({
              file: schema.stream(),
            }),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PrivmonBulkUploadUsersCSVResponse>> => {
        const { errorRetries, maxBulkRequestBodySizeBytes } =
          config.entityAnalytics.monitoring.privileges.users.csvUpload;

        const siemResponse = buildSiemResponse(response);

        try {
          await checkAndInitPrivilegedMonitoringResources(context, logger);

          const secSol = await context.securitySolution;
          const fileStream = request.body.file as HapiReadableStream;

          const body = await secSol.getPrivilegeMonitoringDataClient().uploadUsersCSV(fileStream, {
            retries: errorRetries,
            flushBytes: maxBulkRequestBodySizeBytes,
          });

          return response.ok({ body });
        } catch (e) {
          // TODO TEST THIS ERROR SCENARIO
          const error = transformError(e);
          logger.error(`Error uploading users via CSV: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
