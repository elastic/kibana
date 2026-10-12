/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { IKibanaResponse } from '@kbn/core/server';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefDocument,
  BriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/document';
import { withMinimumLicense } from '../../utils/with_minimum_license';
import { withStaleJobAsInterrupted } from '../store/brief_store';
import type { ExecutiveBriefRouteDeps } from './route_utils';
import {
  EXECUTIVE_BRIEF_ROUTE_SECURITY,
  briefErrorResponse,
  getRequestOwner,
  internalErrorResponse,
  noStableUserResponse,
} from './route_utils';

/** The wire shape: no owner id or schema version. */
export const toBriefResponse = (document: BriefDocument): BriefResponse => ({
  ...omit(document, ['owner', 'schema_version']),
  owner: { username: document.owner.username },
});

/** GET: the caller's brief document in this space (stale jobs read as interrupted), or 404. */
export const getBriefRoute = ({
  router,
  logger,
  getBriefStore,
}: Pick<ExecutiveBriefRouteDeps, 'router' | 'logger' | 'getBriefStore'>): void => {
  router.versioned
    .get({
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
          const stored = await store.get({ ownerId: owner.id, spaceId });
          if (!stored) {
            return briefErrorResponse(response, 404, 'not_found', 'No brief in this space.');
          }
          const body: BriefResponse = toBriefResponse(
            withStaleJobAsInterrupted(stored.document, new Date())
          );
          return response.ok({ body });
        } catch (error) {
          return internalErrorResponse(response, logger, error, 'read the brief');
        }
      })
    );
};
