/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DismissalReason, EngineEvent, EventVerification } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { checkEvidence } from '../engine/verifier_step';
import { DetectionEngineError, getErrorMessage } from '../errors';
import { labelConfirmed, labelDismissed } from '../learning/incidents';
import { rememberConfirmation, rememberDismissal } from '../learning/learning';
import { publishToAlertingV2 } from '../pipeline/publish';
import { nextEventStatus } from '../pipeline/state_machine';
import type { VersionedEvent } from '../storage/events_store';

/** A run may write the same event at the same moment; the operator's change is retried on top. */
const MAX_WRITE_ATTEMPTS = 3;

async function load(scope: IEngineScope, eventId: string): Promise<VersionedEvent> {
  const found = await scope.storage.events.get(eventId);
  if (!found) {
    throw new DetectionEngineError(`Event ${eventId} not found`, 404);
  }
  return found;
}

/**
 * Applies a change to the latest version of an event. On a version conflict the event is read
 * again and the change applied to that, so an operator never overwrites a run's update.
 */
async function updateEvent(
  scope: IEngineScope,
  eventId: string,
  change: (event: EngineEvent) => EngineEvent
): Promise<{ before: EngineEvent; after: EngineEvent }> {
  for (let attempt = 1; ; attempt++) {
    // A bounded retry loop: each attempt re-reads, so it converges unless writes never stop.
    const { event, version } = await load(scope, eventId);
    const after = change(event);
    const [result] = await scope.storage.events.write([{ event: after, version }]);
    if (result.ok) {
      return { before: event, after };
    }
    if (!result.conflict || attempt >= MAX_WRITE_ATTEMPTS) {
      throw new DetectionEngineError(`Could not update event ${eventId}: ${result.error}`, 409);
    }
  }
}

/** Publishes an event a person changed, and records how that went on the event. */
async function publishNow(scope: IEngineScope, event: EngineEvent): Promise<EngineEvent> {
  const config = await scope.storage.getConfig();
  if (!config.publish_to_alerting_v2) {
    return event;
  }
  let published: EngineEvent['published'];
  try {
    await publishToAlertingV2({ ruleEventsClient: await scope.getRuleEventsClient(), event });
    published = { at: new Date().toISOString(), ok: true };
  } catch (error) {
    // The next run retries it.
    published = {
      at: new Date().toISOString(),
      ok: false,
      pending: true,
      error: getErrorMessage(error),
    };
  }
  const { after } = await updateEvent(scope, event.event_id, (latest) => ({
    ...latest,
    published,
  }));
  return after;
}

/**
 * Operators send inputs to the state machine like everything else; they do not pick a status.
 * A dismissal also records member values, so the event stays quiet until the problem is worse,
 * and leaves memory notes the agent reads next time.
 */
export async function applyOperatorInput({
  scope,
  eventId,
  input,
  reason,
  note,
}: {
  scope: IEngineScope;
  eventId: string;
  input: 'dismiss' | 'operator_close';
  reason?: DismissalReason;
  note?: string;
}): Promise<EngineEvent> {
  const now = new Date().toISOString();
  const { before, after } = await updateEvent(scope, eventId, (event) => {
    const transition = nextEventStatus(event.status, input);
    const wasOpen = event.status !== 'inactive';
    return {
      ...event,
      status: transition.to,
      updated_at: now,
      closed_at: wasOpen ? now : event.closed_at,
      close_reason: transition.closeReason ?? event.close_reason,
      open_windows: wasOpen
        ? event.open_windows.map((window, index) =>
            index === event.open_windows.length - 1 ? { ...window, to: now } : window
          )
        : event.open_windows,
      dismissal:
        input === 'dismiss'
          ? {
              reason: reason ?? 'not_actionable',
              note,
              at: now,
              values: Object.fromEntries(
                event.members.map((member) => [member.fingerprint, member.value])
              ),
            }
          : event.dismissal,
      published: { at: now, ok: false, pending: true },
    };
  });

  const config = await scope.storage.getConfig();
  const learned =
    input === 'dismiss'
      ? await Promise.all([
          config.learning.autonomy.memory === 'off'
            ? 0
            : rememberDismissal({
                storage: scope.storage,
                event: after,
                reason: after.dismissal!.reason,
                note,
              }),
          labelDismissed({
            state: scope.storage.state,
            event: after,
            reason: after.dismissal!.reason,
            note,
          }),
        ])
      : undefined;
  await scope.storage.records.appendActivity([
    {
      '@timestamp': now,
      step: 'operator',
      action: input,
      event_id: eventId,
      strategy: after.origin_strategy,
      message:
        input === 'dismiss'
          ? `Dismissed "${before.title}" as ${after.dismissal!.reason}${
              note ? ` ("${note}")` : ''
            }. It stays quiet until the problem is ${Math.round(config.worse_margin * 100)}% worse.`
          : `Closed "${before.title}" by operator (${before.status} -> ${after.status}).`,
    },
    {
      '@timestamp': now,
      step: 'learning',
      action: input === 'dismiss' ? 'memory_updated' : 'recorded',
      event_id: eventId,
      message:
        input === 'dismiss'
          ? `${learned?.[0] ?? 0} memory note(s) added for its series, KIs and services${
              learned?.[1]
                ? `; labelled a false positive (${learned[1].incident_id}), a case every future change is checked against`
                : '; a duplicate is not labelled'
            }.`
          : 'Operator close recorded as evidence for the strategy scorecard.',
    },
  ]);
  return publishNow(scope, after);
}

/** Re-runs an event's evidence on demand and records whether its conclusion still holds. */
export async function verifyEvent({
  scope,
  eventId,
}: {
  scope: IEngineScope;
  eventId: string;
}): Promise<EngineEvent> {
  const { event } = await load(scope, eventId);
  const { found, total } = await checkEvidence({ dataEsClient: scope.dataEsClient, event });
  const verification: EventVerification = {
    at: new Date().toISOString(),
    trigger: 'manual',
    holds: found > 0,
    details: `${found} of ${total} evidence query(ies) still show the problem.`,
  };
  const { after } = await updateEvent(scope, eventId, (latest) => ({ ...latest, verification }));
  await scope.storage.records.appendActivity([
    {
      '@timestamp': verification.at,
      step: 'verifier',
      action: verification.holds ? 'holds' : 'does_not_hold',
      event_id: eventId,
      strategy: event.origin_strategy,
      message: `Verifier (manual) on "${event.title}": ${verification.details}`,
    },
  ]);
  return after;
}

/**
 * A person confirms an event was a real problem. It becomes a labelled incident every future
 * change must keep catching, and memory the agent reads on the next case for these series. The
 * event's status does not change: confirming is a label, not an input to the state machine.
 */
export async function confirmEvent({
  scope,
  eventId,
  note,
  episode,
}: {
  scope: IEngineScope;
  eventId: string;
  note?: string;
  /** 1-based episode to confirm; the current one when absent. */
  episode?: number;
}): Promise<EngineEvent> {
  const { event } = await load(scope, eventId);
  const target = episode ?? event.open_windows.length;
  if (target < 1 || target > Math.max(1, event.open_windows.length)) {
    throw new DetectionEngineError(
      `Event ${eventId} has ${event.open_windows.length} episode(s); ${target} does not exist`,
      400
    );
  }
  if (event.confirmations?.some((item) => item.episode === target)) {
    return event;
  }
  const incident = await labelConfirmed({
    state: scope.storage.state,
    event,
    note,
    episode: target,
  });
  const config = await scope.storage.getConfig();
  const added =
    config.learning.autonomy.memory === 'off'
      ? 0
      : await rememberConfirmation({ storage: scope.storage, event, note });
  const now = new Date().toISOString();
  const { after } = await updateEvent(scope, eventId, (latest) => ({
    ...latest,
    confirmations: [
      ...(latest.confirmations ?? []),
      { episode: target, at: now, note, incident_id: incident.incident_id },
    ],
  }));
  await scope.storage.records.appendActivity([
    {
      '@timestamp': now,
      step: 'learning',
      action: 'confirmed',
      event_id: eventId,
      strategy: event.origin_strategy,
      message: `A person confirmed episode ${target} of "${event.title}" as a real problem${
        note ? ` ("${note}")` : ''
      }: labelled incident ${incident.incident_id}${
        incident.warning_minutes === undefined
          ? ''
          : `, raised ${incident.warning_minutes.toFixed(1)} min after it started`
      }; ${added} memory note(s) added.`,
    },
  ]);
  return after;
}
