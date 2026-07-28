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
  dismissalReason: z
    .enum([
      'wrong',
      'duplicate',
      'insufficient_evidence',
      'low_value',
      'out_of_scope',
      'already_handled',
      'other',
    ])
    .optional(),
});

const REJECT_PROPOSAL_PATH =
  `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/{proposalId}/reject` as const;

export const registerRejectProposalRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
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
      async (context, request, response) => {
        try {
          const { id, proposalId } = request.params;
          const { reason, dismissalReason } = request.body;

          // In mock mode there is no ES document to mutate; echo the decision.
          if (!config.ui.useMockData) {
            const store = getInvestigationStore();
            if (store != null) {
              const esClient = (await context.core).elasticsearch.client.asCurrentUser;
              const updated = await store.updateProposalStatus(
                esClient,
                proposalId,
                {
                  status: 'dismissed',
                  rejectionReason: reason,
                  dismissalReason,
                },
                request
              );
              if (updated == null) {
                return response.notFound({
                  body: { message: `Proposal "${proposalId}" not found` },
                });
              }
              // Reflect the analyst decision on the investigation timeline.
              await store.recordDeepWatchOutcome(esClient, {
                investigationId: id,
                events: [
                  {
                    id: `evt-decision-dismiss-${proposalId}`,
                    timestamp: new Date().toISOString(),
                    type: 'decision',
                    summary: `Analyst dismissed proposal ${proposalId}${
                      dismissalReason ? ` [${dismissalReason}]` : ''
                    }${reason ? `: ${reason}` : ''}`,
                    actor: 'analyst',
                  },
                ],
              });
              // Keep the Brief queue card in step with this decision (its CTA is
              // derived from the parent's pendingProposalCount).
              await store.reconcileInvestigationAfterDecision(esClient, id);
            }
          }

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
