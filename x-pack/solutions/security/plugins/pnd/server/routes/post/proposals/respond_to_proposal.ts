/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  PND_PROPOSAL_RESPOND_URL_TEMPLATE,
  RespondToProposalRequestBody,
  RespondToProposalRequestParams,
  resolvePndWatchDefinitionId,
  type RespondToProposalResponse,
} from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { WorkflowExecutionInvalidStatusError } from '@kbn/workflows/common/errors';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_PROPOSALS_RESPOND } from '../../../../common/constants';
import { parseProposalSourceId } from '../../../lib/proposal_source_id';
import type { RouteDependencies } from '../../register_routes';
import { detectionChangeSignalEvidenceConversationKind } from './helpers/detection_change_signal_evidence_conversation_kind';
import { emitDetectionChangeSignal } from './helpers/emit_detection_change_signal';
import { emitIncidentClosed } from './helpers/emit_incident_closed';
import { resolveRespondTarget } from './helpers/resolve_respond';
import { shouldEmitDetectionChangeSignal } from './helpers/should_emit_detection_change_signal';
import { shouldEmitIncidentClosed } from './helpers/should_emit_incident_closed';
import { warnUnlessEmitted } from './helpers/warn_unless_emitted';

/** Channel slug stamped on the resume so the audit trail attributes it to the PND queue. */
const PND_RESPOND_CHANNEL = 'pnd';

/**
 * `POST /internal/pnd/proposals/{sourceId}/_respond` — respond to a pending HITL gate.
 *
 * Security finding S1 (the sharpest in the epic): resuming a HITL step runs arbitrary
 * downstream workflow steps under the execution's API key, and calling the engine
 * directly bypasses HTTP authz. This route is the mitigated path, and every control is
 * load-bearing:
 *   1. it requires BOTH the PND respond privilege AND the Workflows `execute` privilege
 *      (platform authz below) — neither alone can drive a resume;
 *   2. it re-derives the workflow being resumed from the persisted execution and rejects
 *      unless that workflow is a managed PND watch — the client-supplied source id is
 *      never trusted to name the workflow ({@link resolveRespondTarget});
 *   3. it rejects unless the targeted step is a registered PND gate still awaiting input;
 *   4. it always resumes through `resumeWorkflowExecution`, so `markStepAsResponded`
 *      stamps the responder and enforces first-writer-wins;
 *   5. it requires a non-empty `rationale` **and** a `decision` of exactly `'approve'` or
 *      `'dismiss'` (both enforced by {@link RespondToProposalRequestBody}, so a malformed body is a
 *      `400` before this handler runs). Security finding D2: a body carrying only a rationale used to
 *      proceed as an **approval**, and so did a capitalized `"Dismiss"`, while the orchestrator YAMLs
 *      only ever match `decision : "dismiss"` — fail-open on a consequential path.
 * The space is taken from the request, never a parameter, and never `'*'` (S9).
 *
 * After the resume applies, this handler may emit two events in the caller's space — best-effort,
 * so a Workflows failure never fails the resume:
 *
 * - `pnd.incidentClosed` is a **lifecycle fact** (P3 / D14): *an incident closed*. It fires only
 *   when the containment gate is **approved**, carries ids and nothing else, and as of this change
 *   it has **no subscriber** — see the note on the emit below.
 * - `security.detectionChangeSignal` is a **claim**: *there is a coverage gap here*. It fires at
 *   every Floor terminal that carries a rationale — a dismissal at open-investigation or
 *   promote-incident, and either decision at containment — so a gap found off the incident path is
 *   still reported. It carries that rationale as `gapDescription`, the discovery's ATT&CK tactics,
 *   and refs to the evidence. This is what the post-incident watch subscribes to.
 *
 * They are emitted **independently**: neither is awaited before the other is attempted, and one
 * failing cannot suppress the other. A gap claim is worth having when the lifecycle emit fails, and
 * the lifecycle fact is worth recording when the claim cannot be built.
 *
 * Best-effort is not silent (finding R4): when an emit does not happen, the resume still answers
 * `{ resumed: true }` — it did succeed — and the handler logs that *that* signal did **not** fire,
 * naming the source id, the trigger and the reason.
 */
export const registerRespondToProposalRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_PROPOSAL_RESPOND_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          // Both are required (AND): the PND respond grant and the Workflows execute
          // grant. See the S1 note above — the respond grant alone must not be able to
          // drive a workflow resume.
          requiredPrivileges: [
            PND_API_PRIVILEGE_PROPOSALS_RESPOND,
            WorkflowsManagementApiActions.execute,
          ],
        },
      },
      summary: 'Respond to a pending PND HITL proposal',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(RespondToProposalRequestBody),
            params: buildRouteValidationWithZod(RespondToProposalRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        const { sourceId } = request.params;
        const { input } = request.body;

        const parsed = parseProposalSourceId(sourceId);
        if (parsed == null) {
          return response.badRequest({ body: { message: `Malformed sourceId "${sourceId}"` } });
        }

        const spaceId = getSpaceId(request);

        // Fast reject on the untrusted claimed workflow id (S1 allow-list) before any
        // I/O. Accepts the catalog id or this space's document id. The authoritative
        // re-derivation still runs in resolveRespondTarget.
        if (resolvePndWatchDefinitionId(parsed.workflowId, spaceId) == null) {
          return response.badRequest({
            body: { message: `Workflow "${parsed.workflowId}" is not an allow-listed PND watch` },
          });
        }

        const managementClient = getWorkflowsManagementClient();
        if (managementClient == null) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows management API is not available' },
          });
        }

        try {
          const target = await resolveRespondTarget({ managementClient, parsed, spaceId });

          if (target.status === 'not_found') {
            return response.notFound();
          }
          if (target.status === 'forbidden_workflow') {
            return response.forbidden({
              body: { message: 'Source proposal does not belong to a PND watch' },
            });
          }
          if (target.status === 'unknown_gate') {
            return response.badRequest({
              body: { message: 'Source proposal is not a known PND gate' },
            });
          }
          if (target.status === 'not_pending') {
            return response.conflict({
              body: { message: 'Proposal is no longer awaiting a response' },
            });
          }

          await managementClient.resumeWorkflowExecution(
            target.workflowRunId,
            spaceId,
            { decision: input.decision, rationale: input.rationale },
            request,
            { channel: PND_RESPOND_CHANNEL, stepExecutionId: target.stepExecutionId }
          );

          // P3 / D14: containment is a first-class subscribable moment. `pnd.incidentClosed`
          // still fires only on an **approved** containment — declining is not an incident
          // closing. `security.detectionChangeSignal` is the coverage-gap **claim**, and a gap
          // does not require an incident, so it also fires when opening an investigation or
          // promoting one is dismissed, and when containment is declined. The orchestrator does
          // not emit either event itself; `watch_deep.yaml` has no gap verdict (an LLM-behaviour
          // change, out of budget here), so these terminals are the deterministic emit sites.
          //
          // Best-effort on the emits themselves — a Workflows failure is swallowed by each helper
          // so it can never fail the (already-applied) resume.
          //
          // `pnd.incidentClosed` keeps being emitted even though **nothing subscribes to it any
          // more**. That is deliberate, not leftover: "an incident closed" is a lifecycle fact and
          // "there is a coverage gap here" is a claim, and they were only ever one signal by
          // accident. Keeping them separate is what lets the claim carry a gap description without
          // the lifecycle fact inheriting one, and what leaves a subscribable close event for a
          // consumer that wants the fact without the claim.
          const emitClaim = shouldEmitDetectionChangeSignal({
            decision: input.decision,
            stepId: target.gate.stepId,
          });
          const emitClosed = shouldEmitIncidentClosed({
            decision: input.decision,
            stepId: target.gate.stepId,
          });

          if (emitClaim || emitClosed) {
            const [{ http }, { workflowsExtensions }] = await getStartServices();

            // `allSettled`, so the two signals are independent by construction: neither is awaited
            // before the other starts, one failing cannot suppress the other, and a helper that
            // regressed to throwing still cannot turn a signalling problem into a 500 on a resume
            // that already applied. A path that emits only the claim still goes through
            // `allSettled` so the independence contract stays one shape.
            const [incidentClosed, detectionChangeSignal] = await Promise.allSettled([
              emitClosed
                ? emitIncidentClosed({
                    event: target.event,
                    gateId: target.gate.gateId,
                    logger,
                    request,
                    spaceId,
                    watchId: target.gate.workflowId,
                    workflowsExtensions,
                  })
                : Promise.resolve({ emitted: true as const }),
              emitClaim
                ? emitDetectionChangeSignal({
                    evidenceConversationKind: detectionChangeSignalEvidenceConversationKind(
                      target.gate.stepId
                    ),
                    event: target.event,
                    // The analyst's own words, clipped by the helper — never summarised, and no LLM
                    // anywhere in the payload. `rationale` is required and bounded at exactly the
                    // trigger's `gapDescription` bound, which is why this carries nothing the
                    // workflows execution store did not already hold (S6, ADR-014).
                    gapDescription: input.rationale,
                    gateId: target.gate.gateId,
                    http,
                    logger,
                    request,
                    sourceRunId: target.workflowRunId,
                    spaceId,
                    watchId: target.gate.workflowId,
                    workflowsExtensions,
                  })
                : Promise.resolve({ emitted: true as const }),
            ]);

            if (emitClosed) {
              warnUnlessEmitted({
                logger,
                result: incidentClosed,
                sourceId,
                triggerId: PND_INCIDENT_CLOSED_TRIGGER_ID,
              });
            }
            if (emitClaim) {
              warnUnlessEmitted({
                logger,
                result: detectionChangeSignal,
                sourceId,
                triggerId: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
              });
            }
          }

          const body: RespondToProposalResponse = { resumed: true, sourceId };
          return response.ok({ body });
        } catch (error) {
          if (error instanceof WorkflowExecutionInvalidStatusError) {
            // The gate was claimed or settled between resolution and resume (first-writer-wins).
            return response.conflict({
              body: { message: 'Proposal was already responded to' },
            });
          }
          logger.error(`Failed to respond to PND proposal "${sourceId}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to respond to PND proposal' },
          });
        }
      }
    );
};
