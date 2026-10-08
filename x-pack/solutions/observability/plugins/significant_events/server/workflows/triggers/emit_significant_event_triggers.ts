/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
  type SignificantEventTriggerBasePayload,
} from '../../../common/workflows/triggers';
import type { TriggerEmitter } from './emit';

type SignificantEventSource = Pick<
  SignificantEvent,
  '@timestamp' | 'event_id' | 'title' | 'summary' | 'status' | 'severity' | 'stream_names'
>;

type TriggerStatus = SignificantEventTriggerBasePayload['status'];

/**
 * Subscribers see a two-state lifecycle: `recovering` is the engine's internal wind-down of a
 * still-live event, so it is reported as `active`.
 */
const toTriggerStatus = (status: SignificantEventStatus): TriggerStatus =>
  status === 'recovering' ? 'active' : status;

const baseSignificantEventPayload = (
  significantEvent: SignificantEventSource
): SignificantEventTriggerBasePayload => ({
  event_id: significantEvent.event_id,
  title: significantEvent.title,
  summary: significantEvent.summary,
  status: toTriggerStatus(significantEvent.status),
  severity: significantEvent.severity,
  stream_names: significantEvent.stream_names,
  occurred_at: significantEvent['@timestamp'],
});

/**
 * Runs an emit block best-effort: trigger emission is a side-channel that must never break an
 * already-successful event write, so any synchronous error (e.g. payload building) is swallowed.
 * Async emit failures (getClient/emitEvent) are handled and logged separately in emit.ts.
 */
const emitBestEffort = (emit: () => void): void => {
  try {
    emit();
  } catch {
    // Swallow: emission must not affect the write result.
  }
};

/**
 * Emits `eventCreated` (no prior version) or `eventStatusChanged` (prior version whose lifecycle
 * state differs: `active` <-> `inactive`) for a single written event version. Moving between
 * `active` and `recovering` is not a change subscribers can act on, and emitting it would
 * re-trigger investigations and automations on an event that was never closed.
 */
export const emitSignificantEventWriteTriggers = ({
  emitTrigger,
  significantEvent,
  priorSignificantEvent,
}: {
  /** Fire-and-forget workflow trigger emitter; omitted when workflows are unavailable. */
  emitTrigger: TriggerEmitter | undefined;
  /** The newly written (append-only) significant event version. */
  significantEvent: SignificantEventSource;
  /** The latest version of this event_id that existed before this write, if any. */
  priorSignificantEvent: Pick<SignificantEvent, 'status'> | undefined;
}): void =>
  emitBestEffort(() => {
    if (!priorSignificantEvent) {
      emitTrigger?.(EVENT_CREATED_TRIGGER_ID, baseSignificantEventPayload(significantEvent));
      return;
    }

    const previousStatus = toTriggerStatus(priorSignificantEvent.status);
    if (previousStatus !== toTriggerStatus(significantEvent.status)) {
      emitTrigger?.(EVENT_STATUS_CHANGED_TRIGGER_ID, {
        ...baseSignificantEventPayload(significantEvent),
        previous_status: previousStatus,
      });
    }
  });
