/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const RejectProposalRequestParams = z.object({
  id: z.string().min(1).max(256),
  proposalId: z.string().min(1).max(256),
});

const RejectProposalRequestBody = z.object({
  reason: z.string().optional(),
});

const REJECT_PROPOSAL_PATH =
  `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/{proposalId}/reject` as const;

export const registerRejectProposalRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: REJECT_PROPOSAL_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Reject a proposal for an investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(RejectProposalRequestParams),
            body: buildRouteValidationWithZod(RejectProposalRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { id: _investigationId, proposalId } = request.params;
          const { reason } = request.body;

          // TODO: Update proposal status in ES to 'dismissed'
          // Store reason in proposal.rejection_reason

          return response.ok({
            body: {
              proposalId,
              status: 'dismissed',
              reason,
              message: 'Proposal rejected',
            },
          });
        } catch (error) {
          logger.error(`Failed to reject proposal: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to reject proposal' },
          });
        }
      }
    );
};
