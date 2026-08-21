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

const Params = z.object({
  id: z.string().min(1).max(256),
  proposalId: z.string().min(1).max(256),
});

// Escalation maps to the existing Cases architecture (decision log): the proposal
// is marked `escalated` and, when a case is created/linked, its ref is recorded.
const Body = z.object({
  caseRef: z.string().max(1024).optional(),
});

const PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/{proposalId}/escalate` as const;

export const registerEscalateProposalRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PATH,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } },
      summary: 'Escalate a proposal (to a case)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(Params),
            body: buildRouteValidationWithZod(Body),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { id, proposalId } = request.params;
          const { caseRef } = request.body;

          if (!config.ui.useMockData) {
            const store = getInvestigationStore();
            if (store != null) {
              const esClient = (await context.core).elasticsearch.client.asCurrentUser;
              const updated = await store.updateProposalStatus(
                esClient,
                proposalId,
                {
                  status: 'escalated',
                  caseRef,
                },
                request
              );
              if (updated == null) {
                return response.notFound({
                  body: { message: `Proposal "${proposalId}" not found` },
                });
              }
              await store.recordDeepWatchOutcome(esClient, {
                investigationId: id,
                events: [
                  {
                    id: `evt-decision-escalate-${proposalId}`,
                    timestamp: new Date().toISOString(),
                    type: 'decision',
                    summary: `Analyst escalated proposal ${proposalId}${
                      caseRef ? ` \u2192 case ${caseRef}` : ''
                    }`,
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
            body: { proposalId, status: 'escalated', caseRef, message: 'Proposal escalated' },
          });
        } catch (error) {
          logger.error(`Failed to escalate proposal: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to escalate proposal' },
          });
        }
      }
    );
};
