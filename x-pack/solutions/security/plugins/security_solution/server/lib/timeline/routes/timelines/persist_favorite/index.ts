/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_FAVORITE_URL } from '../../../../../../common/constants';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { persistFavorite } from '../../../saved_object/timelines';
import {
  type PersistFavoriteRouteResponse,
  PersistFavoriteRouteRequestBody,
  TimelineTypeEnum,
} from '../../../../../../common/api/timeline';

export const persistFavoriteRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .patch({
      path: TIMELINE_FAVORITE_URL,
      security: {
        authz: {
          requiredPrivileges: ['timeline_write'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidationWithZod(PersistFavoriteRouteRequestBody) },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PersistFavoriteRouteResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { timelineId, templateTimelineId, templateTimelineVersion, timelineType } =
            request.body;

          const persistFavoriteResponse = await persistFavorite(
            frameworkRequest,
            timelineId || null,
            templateTimelineId || null,
            templateTimelineVersion || null,
            timelineType || TimelineTypeEnum.default
          );

          if (persistFavoriteResponse.code !== 200) {
            return siemResponse.error({
              body: persistFavoriteResponse.message,
              statusCode: persistFavoriteResponse.code,
            });
          } else {
            return response.ok({
              body: persistFavoriteResponse.favoriteTimeline,
            });
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
