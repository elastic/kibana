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
import {
  MONITORING_USERS_CSV_UPLOAD_URL,
  PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE,
} from '../../../../../../common/entity_analytics/privileged_user_monitoring/constants';
import type { HapiReadableStream } from '../../../../../types';
import type { ConfigType } from '../../../../../config';
import type { PrivmonBulkUploadUsersCSVResponse } from '../../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { createPrivilegedUsersCsvService } from '../../users/csv_upload';
import { checkAndInitPrivilegeMonitoringResources } from '../../check_and_init_privmon_resources';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const uploadUsersCSVRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: ConfigType
) => {
  router.versioned
    .post({
      access: 'public',
      path: MONITORING_USERS_CSV_UPLOAD_URL,
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
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<PrivmonBulkUploadUsersCSVResponse>> => {
          const { errorRetries, maxBulkRequestBodySizeBytes } =
            config.entityAnalytics.monitoring.privileges.users.csvUpload;

          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const fileStream = request.body.file as HapiReadableStream;

            const dataClient = secSol.getPrivilegeMonitoringDataClient();
            const csvService = createPrivilegedUsersCsvService(dataClient);
            await checkAndInitPrivilegeMonitoringResources(context, logger);
            const body = await csvService.bulkUpload(fileStream, {
              retries: errorRetries,
              flushBytes: maxBulkRequestBodySizeBytes,
            });

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error uploading users via CSV: ${error.message}`);
            return siemResponse.error({
              statusCode: error.statusCode,
              body: error.message,
            });
          }
        },
        'platinum'
      )
    );
};
