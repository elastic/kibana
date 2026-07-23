/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { realProposals } from './real_data';

const ListProposalsRequestParams = z.object({
  id: z.string().min(1).max(256),
});

const PROPOSALS_PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals` as const;

export const registerListInvestigationProposalsRoute = ({
  router,
  logger,
  config,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSALS_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
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

          // Use hardcoded proposals - in future, this will query ES
          const proposals = realProposals[id] ?? [];

          const body: ListInvestigationProposalsResponse = {
            proposals,
            total: proposals.length,
          };
          return response.ok({ body });
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

// Export handler functions for proposal actions (stubbed for future ES integration)
export const handleAcceptProposal = async (
  investigationId: string,
  proposalId: string
): Promise<boolean> => {
  // TODO: Implement ES update with proposal status change to 'approved'
  return true;
};

export const handleRejectProposal = async (
  investigationId: string,
  proposalId: string,
  reason?: string
): Promise<boolean> => {
  // TODO: Implement ES update with proposal status change to 'dismissed'
  // Store reason in proposal.rejection_reason field
  return true;
};

export const handleModifyProposal = async (
  investigationId: string,
  proposalId: string,
  reasoning: string
): Promise<boolean> => {
  // TODO: Implement ES update with proposal status change to 'modified'
  // Store reasoning in proposal.analyst_reasoning field
  return true;
};
