/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import { withMinimumLicense } from '../../utils/with_minimum_license';
import type { ExecutiveBriefRouteDeps } from './route_utils';
import {
  BRIEF_MINIMUM_LICENSE,
  EXECUTIVE_BRIEF_ROUTE_SECURITY,
  getRequestOwner,
  internalErrorResponse,
  noStableUserResponse,
} from './route_utils';

export interface DeleteBriefResponse {
  deleted: boolean;
}

/**
 * DELETE: removes the caller's brief in this space. A running job's next write fails its
 * `job.id` check, so the task can't recreate the document.
 */
export const deleteBriefRoute = ({
  router,
  logger,
  getBriefStore,
}: Pick<ExecutiveBriefRouteDeps, 'router' | 'logger' | 'getBriefStore'>): void => {
  router.versioned
    .delete({
      access: 'internal',
      path: EXECUTIVE_BRIEF_API_PATH,
      security: EXECUTIVE_BRIEF_ROUTE_SECURITY,
    })
    .addVersion(
      { version: EXECUTIVE_BRIEF_API_VERSION, validate: false },
      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse> => {
        try {
          const owner = await getRequestOwner(context, request);
          if (!owner) {
            return noStableUserResponse(response);
          }
          const spaceId = (await context.securitySolution).getSpaceId();
          const store = await getBriefStore();
          const body: DeleteBriefResponse = {
            deleted: await store.delete({ ownerId: owner.id, spaceId }),
          };
          return response.ok({ body });
        } catch (error) {
          return internalErrorResponse(response, logger, error, 'delete the brief');
        }
      }, BRIEF_MINIMUM_LICENSE)
    );
};
