/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_URL } from '../../../../../../common/constants';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import {
  GetTimelineRequestQuery,
  type GetTimelineResponse,
} from '../../../../../../common/api/timeline';
import { getTimelineTemplateOrNull, getTimelineOrNull } from '../../../saved_object/timelines';

export const getTimelineRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
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
          request: { query: buildRouteValidationWithZod(GetTimelineRequestQuery) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetTimelineResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const query = request.query ?? {};
          const { template_timeline_id: templateTimelineId, id } = query;

          if (templateTimelineId != null && id == null) {
            const timeline = await getTimelineTemplateOrNull(frameworkRequest, templateTimelineId);
            if (timeline) {
              return response.ok({ body: timeline });
            }
          } else if (templateTimelineId == null && id != null) {
            const timelineOrNull = await getTimelineOrNull(frameworkRequest, id);
            if (timelineOrNull) {
              return response.ok({ body: timelineOrNull });
            }
          } else {
            throw new Error('please provide id or template_timeline_id');
          }

          return siemResponse.error({
            statusCode: 404,
            body: 'Could not find timeline',
          });
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
