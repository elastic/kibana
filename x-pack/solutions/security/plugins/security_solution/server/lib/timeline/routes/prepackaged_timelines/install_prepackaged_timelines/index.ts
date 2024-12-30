/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core-http-server';

import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_PREPACKAGED_URL } from '../../../../../../common/constants';

import type { ConfigType } from '../../../../../config';
import {
  InstallPrepackedTimelinesRequestBody,
  type InstallPrepackedTimelinesResponse,
} from '../../../../../../common/api/timeline';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { installPrepackagedTimelines } from './helpers';

import { checkTimelinesStatus } from '../../../utils/check_timelines_status';

import { buildFrameworkRequest } from '../../../utils/common';

export { installPrepackagedTimelines } from './helpers';

export const installPrepackedTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType
) => {
  router.versioned
    .post({
      path: `${TIMELINE_PREPACKAGED_URL}`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        body: {
          maxBytes: config.maxTimelineImportPayloadBytes,
          output: 'stream',
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {},
        version: '2023-10-31',
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InstallPrepackedTimelinesResponse>> => {
        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const prepackagedTimelineStatus = await checkTimelinesStatus(frameworkRequest);

          const installResult =
            InstallPrepackedTimelinesRequestBody.safeParse(prepackagedTimelineStatus);

          if (installResult.error) {
            throw installResult.error;
          }

          const timelinesToInstalled = installResult.data.timelinesToInstall.length ?? 0;
          const timelinesNotUpdated = installResult.data.timelinesToUpdate.length ?? 0;
          let res = null;

          if (timelinesToInstalled > 0 || timelinesNotUpdated > 0) {
            res = await installPrepackagedTimelines(
              config.maxTimelineImportExportSize,
              frameworkRequest,
              true
            );
          }
          if (res instanceof Error) {
            throw res;
          } else {
            return response.ok({
              body: res ?? {
                success: true,
                success_count: 0,
                timelines_installed: 0,
                timelines_updated: 0,
                errors: [],
              },
            });
          }
        } catch (err) {
          const error = transformError(err);
          const siemResponse = buildSiemResponse(response);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
