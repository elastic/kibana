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
import { isBlockedByPolicyOnly } from '../../services/watches/hunt/common/partition_hunt_universe';
import { unsearchedPatterns } from '../../services/watches/hunt/common/unsearched_patterns';
import { huntEsClient } from './hunt_es_client';
import { resolveHuntUniverse } from './resolve_hunt_universe';

export { HUNT_INDEX_SCOPE_URL };

/**
 * The hunt scope for the space: the Security Solution default data view the hunt
 * searches and what resolved inside it, which the Worker's sweep gate reads as `status`.
 * Distinct from Security Solution threat-intel readiness and SIEM Readiness; those stay
 * as-is and must not import this (one-way dependency rule).
 */
export const registerHuntIndexScopeRoute = ({
  router,
  logger,
  getSpaceId,
  getClusterClient,
  isCpsEnabled,
}: RouteDependencies) => {
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
          const esClient = huntEsClient({ getClusterClient, request });
          const { patterns: indexPatterns, policySkipped } = await resolveHuntUniverse(
            context,
            logger
          );

          // `discovered` is the datasets stage 1 parsed for the report matcher; the wire
          // scope carries what they matched, not the list itself.
          const { discovered: _discovered, ...scope } = await resolveHuntScope({
            esClient,
            spaceId,
            indexPatterns,
            policySkippedPatterns: policySkipped,
            crossProjectSearch: isCpsEnabled(),
            logger,
          });
          const policySkippedList = scope.policy_skipped ?? [];
          if (policySkippedList.length > 0) {
            logger.debug(
              `Hunt index scope for space ${spaceId} does not search hidden or alerts indices: ${policySkippedList.join(
                ', '
              )}`
            );
          }
          if (scope.resolution === 'blocked:empty_universe') {
            // `blocked:discovery_failed` already warns inside `resolveHuntScope`.
            logger.warn(
              isBlockedByPolicyOnly(scope)
                ? `Hunt index scope for space ${spaceId} is ${
                    scope.resolution
                  }: the default data view names only hidden or alerts indices (${policySkippedList.join(
                    ', '
                  )})`
                : `Hunt index scope for space ${spaceId} is ${
                    scope.resolution
                  }: the caller resolved none of ${scope.missing.join(', ')}`
            );
          }
          if (scope.status !== 'blocked') {
            const unsearched = unsearchedPatterns(scope);
            if (unsearched.length > 0) {
              logger.debug(
                `Hunt index scope for space ${spaceId} left ${
                  unsearched.length
                } default data view name(s) out of the search because the caller could not read them (no read access, not found, or closed): ${unsearched.join(
                  ', '
                )}`
              );
            }
          }
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
