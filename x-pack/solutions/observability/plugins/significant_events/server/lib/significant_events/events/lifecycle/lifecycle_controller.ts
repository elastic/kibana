/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { RuleEventsClient } from '../rule_events_client';
import type { TriggerEmitter } from '../../../../workflows/triggers/emit';
import { emitSignificantEventWriteTriggers } from '../../../../workflows/triggers/emit_significant_event_triggers';
import {
  decideLifecycle,
  type LifecycleInput,
  type LifecycleSkipReason,
} from './lifecycle_state_machine';
import { toRuleEvent } from '../to_rule_event';

export type LifecycleControllerSkipReason = LifecycleSkipReason | 'not_found' | 'superseded';

export interface LifecycleControllerResult {
  updated: number;
  ignored: number;
  /** The status the series has after this call. */
  status: SignificantEventStatus;
  /** Why nothing was written; set whenever `ignored` is 1. */
  reason?: LifecycleControllerSkipReason;
}

/** The status an input asks for, reported when there is no event to read one from. */
const requestedStatus = (input: LifecycleInput): SignificantEventStatus =>
  (input.kind === 'operator' && input.intent === 'deactivate') || input.kind === 'rule_deleted'
    ? 'inactive'
    : 'active';

/**
 * Applies one lifecycle input to one event: reads its latest version, asks the state machine for
 * the decision, and appends the resulting version through the event store. The operator route,
 * chat tools, and cleanup workflow call it. Discovery writes (`event_write/handler.ts`) and
 * `attach_investigation.ts` still write directly and are not governed by this function.
 */
export const applyLifecycleInput = async ({
  eventSearchClient,
  eventId,
  input,
  assessmentNote,
  expectedTimestamp,
  alertEventsClient,
  emitTrigger,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  input: LifecycleInput;
  assessmentNote?: string;
  /**
   * Writes only while the latest version still carries this `@timestamp`. A newer version means
   * something else (e.g. a discovery write) changed the event since the caller read it.
   */
  expectedTimestamp?: string;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
}): Promise<LifecycleControllerResult> => {
  const latest = await eventSearchClient.findLatestByEventId(eventId);

  if (!latest) {
    return { updated: 0, ignored: 1, status: requestedStatus(input), reason: 'not_found' };
  }

  if (expectedTimestamp !== undefined && latest['@timestamp'] !== expectedTimestamp) {
    return { updated: 0, ignored: 1, status: latest.status, reason: 'superseded' };
  }

  const decision = decideLifecycle({ state: { status: latest.status }, input });
  if (!decision.write) {
    return { updated: 0, ignored: 1, status: latest.status, reason: decision.reason };
  }

  const now = new Date().toISOString();
  // A blank note counts as omitted, so it cannot overwrite the existing one.
  const note = assessmentNote?.trim();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    status: decision.status,
    ...(note ? { assessment_note: note } : {}),
  };

  // `createAlertEvent` waits for a refresh, so an immediate re-fetch (e.g. the UI invalidating its
  // query right after this route responds) sees the new version.
  await alertEventsClient.createAlertEvent(toRuleEvent(updatedEvent));

  // Notify subscribed workflows of the status change (fire-and-forget).
  emitSignificantEventWriteTriggers({
    emitTrigger,
    significantEvent: updatedEvent,
    priorSignificantEvent: latest,
  });

  return { updated: 1, ignored: 0, status: decision.status };
};
