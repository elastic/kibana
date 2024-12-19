/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_URL } from '../../../../../../common/constants';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import {
  buildFrameworkRequest,
  CompareTimelinesStatus,
  TimelineStatusActions,
} from '../../../utils/common';
import { DEFAULT_ERROR } from '../../../utils/failure_cases';
import { createTimelines } from './helpers';
import {
  CreateTimelinesRequestBody,
  type CreateTimelinesResponse,
} from '../../../../../../common/api/timeline';

export * from './helpers';

export const createTimelinesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: TIMELINE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateTimelinesRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateTimelinesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);

          const { timelineId, timeline, version } = request.body;
          const { templateTimelineId, templateTimelineVersion, timelineType, title, status } =
            timeline;
          const compareTimelinesStatus = new CompareTimelinesStatus({
            status,
            title,
            timelineType,
            timelineInput: {
              id: timelineId,
              version,
            },
            templateTimelineInput: {
              id: templateTimelineId,
              version: templateTimelineVersion,
            },
            frameworkRequest,
          });
          await compareTimelinesStatus.init();

          // Create timeline
          if (compareTimelinesStatus.isCreatable) {
            const newTimeline = await createTimelines({
              frameworkRequest,
              timeline,
              timelineVersion: version,
            });

            if (newTimeline.code === 200) {
              return response.ok({
                body: newTimeline.timeline,
              });
            } else {
              return siemResponse.error({
                statusCode: newTimeline.code,
                body: newTimeline.message,
              });
            }
          } else {
            return siemResponse.error(
              compareTimelinesStatus.checkIsFailureCases(TimelineStatusActions.create) || {
                statusCode: 405,
                body: DEFAULT_ERROR,
              }
            );
          }
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
