/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import {
  EXECUTIVE_BRIEF_API_VERSION,
  EXECUTIVE_BRIEF_STATUS_API_PATH,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefStatusResponse } from '../../../../../common/entity_analytics/executive_brief/api';
import { withMinimumLicense } from '../../utils/with_minimum_license';
import { staleJobAsInterrupted } from '../store/brief_store';
import { toJobView } from './brief_response';
import type { ExecutiveBriefRouteDeps } from './route_utils';
import {
  BRIEF_MINIMUM_LICENSE,
  EXECUTIVE_BRIEF_ROUTE_SECURITY,
  briefErrorResponse,
  getRequestOwner,
  internalErrorResponse,
  noStableUserResponse,
} from './route_utils';

/** GET status: the latest job of the caller's brief in this space, for polling, or 404. */
export const getBriefStatusRoute = ({
  router,
  logger,
  getBriefStore,
}: Pick<ExecutiveBriefRouteDeps, 'router' | 'logger' | 'getBriefStore'>): void => {
  router.versioned
    .get({
      access: 'internal',
      path: EXECUTIVE_BRIEF_STATUS_API_PATH,
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
          const job = await store.getJob({ ownerId: owner.id, spaceId });
          if (!job) {
            return briefErrorResponse(response, 404, 'not_found', 'No brief in this space.');
          }
          const body: BriefStatusResponse = toJobView(staleJobAsInterrupted(job, new Date()));
          return response.ok({ body });
        } catch (error) {
          return internalErrorResponse(response, logger, error, 'read the brief status');
        }
      }, BRIEF_MINIMUM_LICENSE)
    );
};
