/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { INTERNAL_TIMELINES_BY_IDS_URL } from '../../../../../../common/constants';
import {
  SortDirection,
  SortFieldTimeline,
  TimelineStatus,
  TimelineType,
  type GetTimelinesResponse,
} from '../../../../../../common/api/timeline';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../../utils/common';
import { getAllTimelineByIds } from '../../../saved_object/timelines';

export const MAX_IDS_PER_REQUEST = 100;
const MAX_ID_LENGTH = 100;
const MAX_SEARCH_LENGTH = 256;

/**
 * Body schema for `POST /internal/timelines/_by_ids`. Internal-only
 */
export const GetTimelinesByIdsRequestBody = z.object({
  ids: z.array(z.string().min(1).max(MAX_ID_LENGTH)).min(1).max(MAX_IDS_PER_REQUEST),
  pageSize: z.number().int().positive().optional(),
  pageIndex: z.number().int().positive().optional(),
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  sortField: SortFieldTimeline.optional(),
  sortOrder: SortDirection.optional(),
  status: TimelineStatus.optional(),
  timelineType: TimelineType.optional(),
  onlyUserFavorite: z.boolean().optional(),
});

export type GetTimelinesByIdsRequestBody = z.infer<typeof GetTimelinesByIdsRequestBody>;

export const getTimelinesByIdsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: INTERNAL_TIMELINES_BY_IDS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['timeline_read'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(GetTimelinesByIdsRequestBody) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetTimelinesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const {
            ids,
            pageSize,
            pageIndex,
            search,
            sortField,
            sortOrder,
            status,
            timelineType,
            onlyUserFavorite,
          } = request.body;

          const res = await getAllTimelineByIds(frameworkRequest, ids, {
            onlyUserFavorite: onlyUserFavorite ?? null,
            pageInfo: {
              pageSize: pageSize ?? ids.length,
              pageIndex: pageIndex ?? 1,
            },
            search: search ?? null,
            sort: sortField && sortOrder ? { sortField, sortOrder } : null,
            status: status ?? null,
            timelineType: timelineType ?? null,
          });

          return response.ok({ body: res });
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
