/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DismissalReason,
  EngineEvent,
  EventVerification,
} from '../../../common/detection_engine/types';
import { runEvidence } from './agent/build_case';
import type { EngineDependencies } from './engine';
import { rememberDismissal } from './learning';
import { publishToAlertingV2 } from './publish';
import { nextEventStatus } from './state_machine';
import { StatusError } from '../errors/status_error';

async function loadEvent(deps: EngineDependencies, eventId: string): Promise<EngineEvent> {
  const event = await deps.storage.getEvent(eventId);
  if (!event) {
    throw new StatusError(`Event ${eventId} not found`, 404);
  }
  return event;
}

async function publishIfEnabled(
  deps: EngineDependencies,
  event: EngineEvent
): Promise<EngineEvent> {
  const config = await deps.storage.getConfig();
  if (!config.publish_to_alerting_v2) {
    return event;
  }
  try {
    await publishToAlertingV2({ ruleEventsClient: await deps.getRuleEventsClient(), event });
    return { ...event, published: { at: new Date().toISOString(), ok: true } };
  } catch (error) {
    return {
      ...event,
      published: { at: new Date().toISOString(), ok: false, error: (error as Error).message },
    };
  }
}

/**
 * Operators send inputs to the state machine like everything else; they do not pick a status.
 * A dismissal also records member values, so the event stays quiet until the problem is worse,
 * and leaves memory notes the agent reads next time.
 */
export async function applyOperatorInput({
  deps,
  eventId,
  input,
  reason,
  note,
}: {
  deps: EngineDependencies;
  eventId: string;
  input: 'dismiss' | 'operator_close';
  reason?: DismissalReason;
  note?: string;
}): Promise<EngineEvent> {
  const event = await loadEvent(deps, eventId);
  const transition = nextEventStatus(event.status, input);
  const now = new Date().toISOString();
  const wasOpen = event.status !== 'inactive';

  const next: EngineEvent = {
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
  };

  if (input === 'dismiss') {
    await rememberDismissal({ storage: deps.storage, event, reason: next.dismissal!.reason, note });
  }

  const published = await publishIfEnabled(deps, next);
  await deps.storage.putEvent(published);
  await deps.storage.appendActivity([
    {
      step: 'operator',
      action: input,
      event_id: eventId,
      message:
        input === 'dismiss'
          ? `Dismissed "${event.title}" as ${next.dismissal!.reason}${
              note ? ` ("${note}")` : ''
            }. It stays quiet until the problem is ${Math.round(
              (await deps.storage.getConfig()).worse_margin * 100
            )}% worse; memory notes added for ${event.members.length} series.`
          : `Closed "${event.title}" by operator (${event.status} -> ${next.status}).`,
    },
    {
      step: 'learning',
      action: input === 'dismiss' ? 'memory_updated' : 'recorded',
      event_id: eventId,
      message:
        input === 'dismiss'
          ? 'The dismissal reason is now memory the agent reads on its next case for these series.'
          : 'Operator close recorded as evidence for the strategy scorecard.',
    },
  ]);
  return published;
}

/** Re-runs an event's evidence on demand and records whether its conclusion still holds. */
export async function verifyEvent({
  deps,
  eventId,
}: {
  deps: EngineDependencies;
  eventId: string;
}): Promise<EngineEvent> {
  const event = await loadEvent(deps, eventId);
  const results = await Promise.all(
    event.members.map((member) => runEvidence(deps.dataEsClient, member.evidence_esql))
  );
  const found = results.filter(
    (result, index) =>
      result.result === 'found' ||
      (event.members[index].unit === 'drop' && result.result === 'empty')
  ).length;
  const verification: EventVerification = {
    at: new Date().toISOString(),
    trigger: 'manual',
    holds: found > 0,
    details: `${found} of ${results.length} evidence query(ies) still show the problem.`,
  };
  const next = { ...event, verification };
  await deps.storage.putEvent(next);
  await deps.storage.appendActivity([
    {
      step: 'verifier',
      action: verification.holds ? 'holds' : 'does_not_hold',
      event_id: eventId,
      message: `Verifier (manual) on "${event.title}": ${verification.details}`,
    },
  ]);
  return next;
}
