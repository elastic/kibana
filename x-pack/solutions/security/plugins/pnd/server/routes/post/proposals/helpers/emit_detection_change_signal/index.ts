/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import {
  type DetectionChangeSignalEvent,
  PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  type PndGateId,
  deriveConversationIds,
} from '@kbn/pnd-common';
import { readCorrelationIdFromEvent } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import type { DetectionChangeSignalEvidenceConversationKind } from '../detection_change_signal_evidence_conversation_kind';
import { resolveAttackDiscoveryTactics } from '../resolve_attack_discovery_tactics';

/** Why a coverage-gap emit produced no `security.detectionChangeSignal` event. */
export type EmitDetectionChangeSignalFailureReason =
  /** The Workflows emit itself failed: unavailable client, schema validation, transport. */
  | 'emit_failed'
  /** The resumed execution carried no `correlationId`, so there is nothing to cite. */
  | 'missing_attack_discovery_alert_id'
  /** The rationale was blank, so the claim would have no `gapDescription`. */
  | 'missing_gap_description';

/** Whether the claim fired, so the caller can record a resume that woke no subscriber (finding R4). */
export type EmitDetectionChangeSignalResult =
  | { emitted: true }
  | { emitted: false; reason: EmitDetectionChangeSignalFailureReason };

export interface EmitDetectionChangeSignalParams {
  /**
   * Which derived conversation to cite. Containment cites the incident; a dismissal that
   * never opened one cites the investigation, which is the container that exists.
   */
  evidenceConversationKind: DetectionChangeSignalEvidenceConversationKind;
  /** The decoded `context.event` of the resumed Watch Floor execution (the AD trigger payload). */
  event: Record<string, unknown> | undefined;
  /**
   * The analyst's or worker's `rationale`, verbatim — their own words for what was missed.
   * Clipped, never summarised: an LLM anywhere in this path would turn a human's claim into a
   * generated one.
   */
  gapDescription: string;
  /** Short id of the gate (or terminal path) that produced the claim; named in the diagnostics. */
  gateId: PndGateId | 'not_an_incident';
  /** Core's HTTP start contract, used to resolve the discovery's tactics as the caller (S3). */
  http: HttpServiceStart;
  logger: Logger;
  /** The responding user's request — `emitEvent` derives the space and attribution from it (P3/D14). */
  request: KibanaRequest;
  /** Workflow execution id of the run that produced the claim. */
  sourceRunId: string;
  /** Space resolved from the request (security finding S9); also stamped on the event payload. */
  spaceId: string;
  /** Managed watch workflow id that produced the claim; the subscriber allow-lists it. */
  watchId: string;
  /** Workflows-extensions start contract, source of the request-scoped emit client. */
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

/**
 * Emit exactly one `security.detectionChangeSignal` for a concluded investigation.
 *
 * This is the **claim** — *"there is a coverage gap here"* — and it is deliberately a second,
 * separate event beside the `pnd.incidentClosed` **lifecycle fact**. They were only ever one signal
 * by accident: keeping them apart is what lets this one carry a gap description without the
 * lifecycle signal inheriting one, and what lets a producer with no incident behind it (a dismissed
 * investigation, a not-an-incident verdict, Dark Watch) raise the same claim.
 *
 * ## What the payload is allowed to contain
 *
 * Ids, ATT&CK labels, and one bounded prose field:
 *
 * - `tactics` come from the Attack Discovery document, resolved as the calling user
 *   ({@link resolveAttackDiscoveryTactics}, security finding S3). **No LLM is involved anywhere in
 *   this construction** — every field is either an id already in hand or a projection of a document
 *   the caller can read.
 * - `gapDescription` is the analyst's or worker's `rationale`, clipped to the schema bound. That bound
 *   is *exactly* the rationale's own bound, and the rationale is already persisted in the workflows
 *   execution store (as a gate resume payload, or as the investigation worker's structured output),
 *   which is the argument that this event widens nothing (security finding S6, ADR-014). Whatever
 *   they wrote is what travels: no alert field values, no host or user names, because there is
 *   nothing here that could add them.
 * - `evidenceRefs` are refs, never inline evidence (D7): the discovery and the derived conversation
 *   that actually exists for this path. The subscriber fetches the narrative itself, as the caller.
 * - `confidence` is **omitted**. There is no measured confidence at these terminals, and inventing
 *   one is the failure mode the field is optional to avoid. So are `ruleRef` and `technique`: the
 *   rule to tune is chosen downstream from the discovery's constituent alerts, not asserted here.
 *
 * ## Why it cannot fail the resume
 *
 * Modelled on `discoveries`' `emitAttackDiscoveryCreatedEvent`: every failure path is caught and
 * reported, so this **never throws**. The investigation has already concluded by the time this runs,
 * and a downstream signalling problem must not fail the analyst's response (or the Floor's
 * not-an-incident terminal). It is equally never *silent* (finding R4): each path that does not
 * emit says so at `warn` or above and names itself, and a degraded-but-emitted signal (tactics
 * unresolved) warns too.
 */
export const emitDetectionChangeSignal = async ({
  evidenceConversationKind,
  event,
  gapDescription,
  gateId,
  http,
  logger,
  request,
  sourceRunId,
  spaceId,
  watchId,
  workflowsExtensions,
}: EmitDetectionChangeSignalParams): Promise<EmitDetectionChangeSignalResult> => {
  const correlationId = readCorrelationIdFromEvent(event);

  // Same shape as `emitIncidentClosed`'s R4 guard: a manually-run watch has no discovery on its
  // `context.event`, and `evidenceRefs` is `min(1)` with nothing else to cite, so the emit could only
  // ever fail validation. Name it instead of paying for a round trip that cannot succeed.
  if (correlationId.trim() === '') {
    logger.warn(
      `Resumed PND gate "${gateId}" on watch "${watchId}" in space "${spaceId}" without emitting "${PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID}": the resumed execution's context.event carries no correlationId, so the claim would have no evidence to cite. The resume stands.`
    );
    return { emitted: false, reason: 'missing_attack_discovery_alert_id' };
  }

  // `RespondToProposalRequestBody` already requires a non-empty rationale, so this is unreachable
  // through the route. It stays because the alternative to rejecting a blank here is emitting a
  // coverage claim that says nothing, and a `min(1)` violation deep in the engine reads as a
  // transport failure rather than as the missing input it is.
  if (gapDescription.trim() === '') {
    logger.warn(
      `Resumed PND gate "${gateId}" on watch "${watchId}" in space "${spaceId}" without emitting "${PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID}": the response carried no rationale, so the claim would have no gap description. The resume stands.`
    );
    return { emitted: false, reason: 'missing_gap_description' };
  }

  // Degrade rather than drop: `tactics` is permitted to be empty, so an unreadable or unreachable
  // discovery costs the ATT&CK labels, not the claim. Warn, because a silently label-less signal
  // looks exactly like a discovery that genuinely carried no tactics (finding R4).
  const tactics = await resolveAttackDiscoveryTactics({
    correlationId,
    http,
    request,
    spaceId,
  }).catch((error) => {
    logger.warn(
      `Could not resolve MITRE ATT&CK tactics for correlationId "${correlationId}" in space "${spaceId}"; emitting "${PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID}" without them: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  });

  try {
    const derived = deriveConversationIds(correlationId);
    const evidenceConversationId =
      evidenceConversationKind === 'incident'
        ? derived.incidentConversationId
        : derived.investigationConversationId;

    const payload: DetectionChangeSignalEvent = {
      evidenceRefs: [
        { id: correlationId, kind: 'attack_discovery' },
        { id: evidenceConversationId, kind: 'conversation' },
      ],
      gapDescription: gapDescription
        .trim()
        .slice(0, PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH),
      sourceRunId,
      sourceWatchId: watchId,
      spaceId,
      tactics,
    };

    const client = await workflowsExtensions.getClient(request);
    await client.emitEvent(PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID, payload);

    return { emitted: true };
  } catch (error) {
    logger.error(
      `Failed to emit "${PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID}" for gate "${gateId}" on watch "${watchId}" in space "${spaceId}" for correlationId "${correlationId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return { emitted: false, reason: 'emit_failed' };
  }
};
