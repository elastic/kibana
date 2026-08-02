/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import { getMockProposalsByInvestigationId } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { RouteDependencies } from '../register_routes';
import { getLiveExecutionReadAuthz } from '../watches/watch_route_security';
import { buildAttackDiscoveryWorkflowsSignalHeaders } from '../../lib/attack_discovery_workflows_signal';
import { readPendingProposalRows } from '../get/proposals/helpers/read_pending_proposal_rows';
import { filterRowsByInvestigation } from './helpers/filter_rows_by_investigation';
import { proposalRowToProposal } from './helpers/proposal_row_to_proposal';

const ListProposalsRequestParams = z.object({
  id: z.string().min(1).max(256),
});

const PROPOSALS_PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals` as const;

/**
 * `GET /internal/pnd/investigations/{id}/proposals` — one investigation's proposals.
 *
 * Two things read proposals, and since `kibana-phf4.29` there is only one place they are read *from*.
 * In live mode this delegates to {@link readPendingProposalRows} — the same parked-gate projection
 * `GET /internal/pnd/proposals` serves — filters it to the given investigation, and projects each row
 * onto the `Proposal` contract with {@link proposalRowToProposal}. Before that it answered
 * `{ proposals: [], total: 0 }` on any live stack: a shape with no engine behind it (register #45).
 *
 * The path, the route id, the `PND_API_PRIVILEGE_READ` authz and the `useMockData` branch are
 * unchanged; the mock branch is byte-for-byte what it was, so the demo path and its Scout specs are
 * untouched. Every security property of the queue travels with the rows rather than being restated
 * here: the space comes from the request and never a parameter (S9), gates are restricted to
 * registered `PND_GATE_REGISTRY` entries (D4), and the listing is filtered to discoveries the calling
 * user can read (S3/D3).
 *
 * The AD-2.0-enabled header is stamped in live mode only, for the same reason the queue stamps it: an
 * empty list because the space setting is off is not a bug, and a caller cannot tell the difference
 * without being told.
 */
export const registerListInvestigationProposalsRoute = ({
  config,
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSALS_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getLiveExecutionReadAuthz(),
      },
      summary: 'List proposals for a PND investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ListProposalsRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { id } = request.params;

          if (config.ui.useMockData) {
            const proposals = getMockProposalsByInvestigationId(id);
            const body: ListInvestigationProposalsResponse = {
              proposals,
              total: proposals.length,
            };
            return response.ok({ body });
          }

          const result = await readPendingProposalRows({
            getStartServices,
            getWorkflowsManagementClient,
            logger,
            request,
            spaceId: getSpaceId(request),
          });

          if (result.outcome === 'ad_workflows_disabled') {
            return response.ok({
              body: { proposals: [], total: 0 },
              headers: buildAttackDiscoveryWorkflowsSignalHeaders(false),
            });
          }

          if (result.outcome === 'workflows_unavailable') {
            return response.customError({
              statusCode: 503,
              body: { message: 'Workflows management API is not available' },
            });
          }

          const proposals = filterRowsByInvestigation({
            investigationId: id,
            rows: result.rows,
          }).map((row) => proposalRowToProposal({ parentConversationId: id, row }));

          const body: ListInvestigationProposalsResponse = {
            proposals,
            total: proposals.length,
          };

          return response.ok({
            body,
            headers: buildAttackDiscoveryWorkflowsSignalHeaders(true),
          });
        } catch (error) {
          logger.error(`Failed to list investigation proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list investigation proposals' },
          });
        }
      }
    );
};
