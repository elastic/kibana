/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  type PndGateId,
  deriveConversationIds,
} from '@kbn/pnd-common';
import { readCorrelationIdFromEvent } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import type { IncidentClosedEvent } from '../../../../../../common/workflow_triggers/incident_closed';

/** Why a containment resume produced no `pnd.incidentClosed` event. */
export type EmitIncidentClosedFailureReason =
  /** The Workflows emit itself failed: unavailable client, schema validation, transport. */
  | 'emit_failed'
  /** The resumed execution carried no `correlationId` — see the R4 note below. */
  | 'missing_attack_discovery_alert_id';

/**
 * Whether the signal fired, so the caller can tell "resumed **and** emitted" apart from "resumed,
 * but the Detection Watch was never woken" — the two used to be indistinguishable (finding R4).
 */
export type EmitIncidentClosedResult =
  | { emitted: true }
  | { emitted: false; reason: EmitIncidentClosedFailureReason };

export interface EmitIncidentClosedParams {
  /** The decoded `context.event` of the resumed Watch Floor execution (the AD trigger payload). */
  event: Record<string, unknown> | undefined;
  /** Short id of the gate that was resumed; named in the diagnostics so a failure is attributable. */
  gateId: PndGateId;
  logger: Logger;
  /** The responding user's request — `emitEvent` derives the space and attribution from it (P3/D14). */
  request: KibanaRequest;
  /** Space resolved from the request (security finding S9); also stamped on the event payload. */
  spaceId: string;
  /** Managed watch workflow id that owned the containment gate. */
  watchId: string;
  /** Workflows-extensions start contract, source of the request-scoped emit client. */
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

/**
 * Emit exactly one `pnd.incidentClosed` event for a resumed containment gate (P3 / D14).
 *
 * The event carries **ids and non-sensitive metadata only** (security finding S6): the AD alert id
 * taken from the resumed execution's `context.event`, the deterministic incident conversation id
 * derived from it, the owning watch id, and the space. The client is scoped to the responding
 * user's request so `emitEvent` lands the event in the caller's space (never `'*'`).
 *
 * Emitting is **best-effort**: a Workflows failure (unavailable client, validation, transport) is
 * logged and swallowed, because a downstream signalling problem must never fail the analyst's
 * containment resume — the incident is already contained by the time this runs. Best-effort is not
 * silent, though (finding R4): every path that does **not** emit says so at `warn` or above and
 * reports it back, so the caller can keep answering `{ resumed: true }` while still recording that
 * the downstream Detection Watch was not woken.
 */
export const emitIncidentClosed = async ({
  event,
  gateId,
  logger,
  request,
  spaceId,
  watchId,
  workflowsExtensions,
}: EmitIncidentClosedParams): Promise<EmitIncidentClosedResult> => {
  const correlationId = readCorrelationIdFromEvent(event);

  // Finding R4: a **manually-run** Watch Floor (`watch_floor.yaml`'s `- type: manual` trigger) has
  // no `correlationId` on its `context.event`. `''` fails the trigger schema's `min(1)`, so
  // the emit below could only ever throw — and it used to be swallowed whole, leaving the analyst
  // with `{ resumed: true }`, no incident-closed signal, and nothing anywhere saying so. Fail fast
  // and name it instead of paying for a round trip that cannot succeed.
  if (correlationId.trim() === '') {
    logger.warn(
      `Resumed PND gate "${gateId}" on watch "${watchId}" in space "${spaceId}" without emitting "${PND_INCIDENT_CLOSED_TRIGGER_ID}": the resumed execution's context.event carries no correlationId, which is the shape of a manually-run watch. The resume stands; the downstream Detection Watch will not be woken for it.`
    );
    return { emitted: false, reason: 'missing_attack_discovery_alert_id' };
  }

  try {
    const { incidentConversationId } = deriveConversationIds(correlationId);

    const payload: IncidentClosedEvent = {
      correlationId,
      incidentConversationId,
      spaceId,
      watchId,
    };

    const client = await workflowsExtensions.getClient(request);
    await client.emitEvent(PND_INCIDENT_CLOSED_TRIGGER_ID, payload);

    return { emitted: true };
  } catch (error) {
    logger.error(
      `Failed to emit "${PND_INCIDENT_CLOSED_TRIGGER_ID}" for gate "${gateId}" on watch "${watchId}" in space "${spaceId}" for correlationId "${correlationId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return { emitted: false, reason: 'emit_failed' };
  }
};
