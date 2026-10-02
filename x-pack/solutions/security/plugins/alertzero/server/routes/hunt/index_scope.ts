/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIndexScopeResponse } from '@kbn/alertzero-common';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INDEX_SCOPE_URL } from '../../../common/constants';
import { resolveHuntScope } from '../../services/watches/hunt/common/resolve_index_scope';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';
import type { RouteDependencies } from '../register_routes';
import { resolveHuntUniverse } from './resolve_hunt_universe';

export { HUNT_INDEX_SCOPE_URL };

/**
 * The hunt scope for the space: the Security Solution default data view the hunt
 * searches and what resolved inside it, which the Worker's sweep gate reads as `status`.
 * Distinct from Security Solution threat-intel readiness and SIEM Readiness; those stay
 * as-is and must not import this (one-way dependency rule).
 */
export const registerHuntIndexScopeRoute = ({ router, logger, getSpaceId }: RouteDependencies) => {
  router.versioned
    .get({
      path: HUNT_INDEX_SCOPE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Hunt index scope',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const indexPatterns = await resolveHuntUniverse(context, logger);

          // `discovered` is the datasets stage 1 parsed for the report matcher; the wire
          // scope carries what they matched, not the list itself.
          const { discovered: _discovered, ...scope } = await resolveHuntScope({
            esClient,
            spaceId,
            indexPatterns,
            logger,
          });
          const body: HuntIndexScopeResponse = scope;

          return response.ok({ body });
        } catch (err) {
          logger.error(`Failed to resolve hunt index scope: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve hunt index scope' },
          });
        }
      })
    );
};
