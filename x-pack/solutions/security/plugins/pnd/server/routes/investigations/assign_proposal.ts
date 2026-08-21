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

// `assignee: null` explicitly unassigns — distinct from omitting the field.
const Body = z.object({
  assignee: z.string().min(1).max(256).nullable(),
});

const PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/{proposalId}/assign` as const;

/**
 * Assign (or unassign) a proposal to an owner. This is the MVP requirements'
 * sixth proposal decision — "approve, modify, dismiss, escalate, assign, or
 * defer" (daybreak-requirements.md, Proposal Queue And Control Plane) — the
 * one decision verb that previously had no route, even though the store
 * already modeled the transition (`ProposalStatusUpdate` union's
 * `{ status: 'pending'; assignee: string | null }` arm). Assigning does not
 * change lifecycle status: it stays/returns to `pending`, mirroring how a
 * ticket tracker's "assign" is a metadata mutation, not a state transition.
 */
export const registerAssignProposalRoute = ({
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
      summary: 'Assign a proposal to an owner',
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
          const { assignee } = request.body;

          if (!config.ui.useMockData) {
            const store = getInvestigationStore();
            if (store != null) {
              const esClient = (await context.core).elasticsearch.client.asCurrentUser;
              const updated = await store.updateProposalStatus(
                esClient,
                proposalId,
                { status: 'pending', assignee },
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
                    id: `evt-decision-assign-${proposalId}`,
                    timestamp: new Date().toISOString(),
                    type: 'decision',
                    summary:
                      assignee != null
                        ? `Analyst assigned proposal ${proposalId} to ${assignee}`
                        : `Analyst unassigned proposal ${proposalId}`,
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
            body: { proposalId, assignee, message: 'Proposal assigned' },
          });
        } catch (error) {
          logger.error(`Failed to assign proposal: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to assign proposal' },
          });
        }
      }
    );
};
