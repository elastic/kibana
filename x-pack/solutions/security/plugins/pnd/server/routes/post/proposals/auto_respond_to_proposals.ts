/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  AutoRespondToProposalsRequestBody,
  INTERNAL_API_ACCESS,
  PND_AUTO_RESPOND_CHANNELS,
  PND_AUTO_RESPOND_RATIONALE_PREFIX,
  PND_PROPOSALS_AUTO_RESPOND_URL,
} from '@kbn/pnd-common';
import type { AutoRespondToProposalsResponse } from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_AUTONOMY_WRITE } from '../../../../common/constants';
import {
  listPendingPndGates,
  PND_PENDING_GATES_MAX_RUNS,
} from '../../../lib/list_pending_pnd_gates';
import { asWatchAutonomyLevel } from '../../../lib/as_watch_autonomy_level';
import { isSystemSecurityWatchId } from '../../../lib/is_system_security_watch_id';
import type { RouteDependencies } from '../../register_routes';
import { approveGate } from './helpers/approve_gate';
import { partitionAutoRespondableGates } from './helpers/partition_auto_respondable_gates';

/** Upper bound on parked runs a single auto-respond considers; mirrors the list route. */
const PND_AUTO_RESPOND_PAGE_SIZE = PND_PENDING_GATES_MAX_RUNS;

/**
 * `POST /internal/pnd/proposals/_auto_respond` — auto-accept the gates the current
 * autonomy level permits.
 *
 * This is the general server-side auto-approval path: the autonomy dial uses
 * `origin: 'dial'`, and the auto-approver (after `.6`) uses `origin: 'auto'`.
 * Raising the autonomy level while proposals are already waiting does not
 * retroactively clear them (the gates were created by earlier orchestrator
 * steps), so the UI calls this to reconcile. It is gated on the same dedicated
 * autonomy-write privilege as `PUT /autonomy`.
 *
 * Security finding S1/D1: it ALSO requires the Workflows `execute` privilege,
 * because this route resumes workflow executions exactly as `_respond` does.
 * Requiring only `pnd_autonomy_write` — which is `includeIn: 'none'` and
 * therefore grantable on its own — would have made this route a workflow-resume
 * primitive behind a single PND privilege, the very escalation S1 exists to
 * prevent. Note the mandated `workflowsManagement:execute` is itself the
 * unconstrained platform resume grant: the PND allow-lists constrain *this
 * route's* surface, not the caller's underlying capability.
 *
 * Security finding S5: `alwaysGate` gates are refused **unconditionally, at every
 * level** ({@link partitionAutoRespondableGates}), because a gate that is already
 * pending is not protected by the YAML's structural `if`-less guard. The
 * compensating S5-b re-read lives in {@link approveGate} — the single auto-approval
 * resume call site — so a bypassed partition still fails closed. Every accepted
 * gate is resumed through that seam (never the engine directly), so the audit
 * stamp and first-writer-wins still apply. The space is always the request's,
 * never a parameter and never `'*'` (S9). Autonomy is always read from the
 * per-space template values — never trusted from the request body.
 */
export const registerAutoRespondToProposalsRoute = ({
  getSpaceId,
  getWatchesService,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_PROPOSALS_AUTO_RESPOND_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          // Both are required (AND), matching `_respond`. See the S1/D1 note above — the
          // autonomy-write grant alone must not be able to drive a workflow resume.
          requiredPrivileges: [
            PND_API_PRIVILEGE_AUTONOMY_WRITE,
            WorkflowsManagementApiActions.execute,
          ],
        },
      },
      summary: 'Auto-respond to pending PND proposals the current autonomy level accepts',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AutoRespondToProposalsRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        const { origin, watchId } = request.body;

        // S1/S4: allow-list the watch id before doing anything else.
        if (!isSystemSecurityWatchId(watchId)) {
          return response.badRequest({ body: { message: `Unknown watchId "${watchId}"` } });
        }

        const managementClient = getWorkflowsManagementClient();
        if (managementClient == null) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows management API is not available' },
          });
        }

        try {
          const spaceId = getSpaceId(request);
          const current = await getWatchesService().get(watchId, spaceId, request);
          // Narrowed rather than trusted, for the same reason `GET /autonomy` narrows it: a legacy
          // ordinal must auto-respond to nothing rather than clamp up to Supervised and accept gates.
          const autonomyLevel = asWatchAutonomyLevel(current?.settings?.autonomy);

          // Reads the watch's parked runs directly, so gates owned by a global (`'*'`)
          // managed watch are found rather than silently dropped (bead `kibana-idjb.21`).
          const { results } = await listPendingPndGates({
            logger,
            managementClient,
            size: PND_AUTO_RESPOND_PAGE_SIZE,
            spaceId,
            watchIds: [watchId],
          });

          const { autoRespondable, skipped } = partitionAutoRespondableGates({
            autonomyLevel,
            steps: results,
            watchId,
          });

          // The rationale is the ONLY thing separating an auto-respond from a human approval
          // in history: both resume through `resumeWorkflowExecution` and both stamp the
          // acting user. The prefix therefore lives in `@kbn/pnd-common` so the Brief's
          // "Answered by" derivation reads the same literal this writes (D12). The origin
          // suffix lets that surface distinguish the machine path from the dial.
          const channel = PND_AUTO_RESPOND_CHANNELS[origin];

          const outcomes = await Promise.all(
            autoRespondable.map(async (gate) => {
              try {
                await approveGate(gate, {
                  channel,
                  managementClient,
                  rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}${autonomyLevel} (${origin})`,
                  request,
                  spaceId,
                });
                return true;
              } catch (error) {
                logger.warn(
                  `Failed to auto-respond pending gate ${gate.stepExecutionId} on run ${
                    gate.workflowRunId
                  }: ${error instanceof Error ? error.message : String(error)}`
                );
                return false;
              }
            })
          );

          const approved = outcomes.filter(Boolean).length;
          const failed = outcomes.length - approved;

          const body: AutoRespondToProposalsResponse = {
            approved,
            skipped: skipped + failed,
          };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to auto-respond to PND proposals for watch "${watchId}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to auto-respond to PND proposals' },
          });
        }
      }
    );
};
