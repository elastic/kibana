/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  type ListProposalsResponse,
  PND_PROPOSALS_URL,
} from '@kbn/pnd-common';

import type { RouteDependencies } from '../../register_routes';
import { getLiveExecutionReadAuthz } from '../../watches/watch_route_security';
import { buildAttackDiscoveryWorkflowsSignalHeaders } from '../../../lib/attack_discovery_workflows_signal';
import { PND_PENDING_GATES_MAX_RUNS } from '../../../lib/list_pending_pnd_gates';
import { groupProposals } from './helpers/group_proposals';
import { readPendingProposalRows } from './helpers/read_pending_proposal_rows';

/**
 * Upper bound on parked runs read per request. The queue is a transient working set
 * (a handful of live incidents), so a single bounded page with no cursor is enough,
 * and it caps the number of per-run `getWorkflowExecution` lookups the enrichment does.
 */
export const PND_PROPOSALS_PAGE_SIZE = PND_PENDING_GATES_MAX_RUNS;

/**
 * `GET /internal/pnd/proposals` — the grouped HITL queue.
 *
 * Returns the space's pending `waitForInput` gates grouped by recommended action. The rows
 * themselves — the projection, the space and readability rules, the de-duplication and the thread
 * titles — come from {@link readPendingProposalRows}, which is also what
 * `GET /internal/pnd/investigations/{id}/proposals` reads, so the two surfaces of the one proposals
 * contract cannot drift. This route adds only what is its own: the recommended-action grouping and
 * the HTTP shaping of the two outcomes that produce no rows.
 */
export const registerListProposalsRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_PROPOSALS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getLiveExecutionReadAuthz(),
      },
      summary: 'List pending PND HITL proposals grouped by recommended action',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (_context, request, response) => {
        try {
          const result = await readPendingProposalRows({
            getStartServices,
            getWorkflowsManagementClient,
            logger,
            request,
            size: PND_PROPOSALS_PAGE_SIZE,
            spaceId: getSpaceId(request),
          });

          // AD 2.0 off in this space means the queue is empty by design; stamp the signal so the
          // caller can render a hint naming the setting rather than treat it as a bug.
          if (result.outcome === 'ad_workflows_disabled') {
            return response.ok({
              body: { groups: [], total: 0 },
              headers: buildAttackDiscoveryWorkflowsSignalHeaders(false),
            });
          }

          if (result.outcome === 'workflows_unavailable') {
            return response.customError({
              statusCode: 503,
              body: { message: 'Workflows management API is not available' },
            });
          }

          const { rows } = result;
          const body: ListProposalsResponse = {
            groups: groupProposals(rows),
            total: rows.length,
          };

          return response.ok({
            body,
            headers: buildAttackDiscoveryWorkflowsSignalHeaders(true),
          });
        } catch (error) {
          logger.error(`Failed to list PND proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list PND proposals' },
          });
        }
      }
    );
};
