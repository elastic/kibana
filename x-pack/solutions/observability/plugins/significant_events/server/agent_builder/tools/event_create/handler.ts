/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import { eventsWriteHandler, type EventsWriteInput } from '../event_write/handler';
import { createBulkWriteOutcomeUnknownError } from '../bulk_write';

/**
 * Chat-initiated event input — a minimal subset of EventsWriteInput.
 *
 * Always-write snapshot: a generated `event_id` is supplied so find-or-create does not
 * collapse chat creates onto an existing same-stream event. `status` defaults to 'active'.
 * Severity is computed from signals and topology; a chat-created event carries neither,
 * so it computes to 'low' until evidence is attached.
 */
export type EventCreateInput = Pick<
  EventsWriteInput,
  'title' | 'symptom_hypothesis' | 'summary' | 'stream_names'
> & {
  status?: EventsWriteInput['status'];
};

export async function createEventToolHandler({
  eventSearchClient,
  eventInput,
  alertEventsClient,
  emitTrigger,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  eventInput: EventCreateInput;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  logger?: Logger;
}): Promise<{ event_id: string; acknowledged: true }> {
  const result = await eventsWriteHandler({
    eventSearchClient,
    input: {
      ...eventInput,
      event_id: uuidv4(),
      status: eventInput.status ?? 'active',
    },
    alertEventsClient,
    emitTrigger,
    logger,
  });
  if (!result.written) {
    throw createBulkWriteOutcomeUnknownError(
      `Event write skipped (${result.reason}): event_id=${result.event_id}`
    );
  }
  return { event_id: result.event_id, acknowledged: true };
}
