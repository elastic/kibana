/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import { eventsWriteHandler, type EventsWriteInput } from '../event_write/handler';
import { createBulkWriteOutcomeUnknownError } from '../bulk_write';

/**
 * Chat-initiated event input — a minimal subset of EventsWriteInput.
 *
 * Always-write snapshot: a generated `event_id` is supplied so find-or-create does not
 * collapse chat creates onto an existing same-source event. `status` defaults to 'active'.
 */
export type EventCreateInput = Pick<
  EventsWriteInput,
  'title' | 'symptom_hypothesis' | 'summary' | 'source_ids' | 'severity' | 'confidence'
> & {
  status?: EventsWriteInput['status'];
};

export async function createEventToolHandler({
  eventSearchClient,
  eventInput,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  eventInput: EventCreateInput;
  logger?: Logger;
}): Promise<{ event_id: string; group_hash: string; acknowledged: true }> {
  const eventId = uuidv4();
  const result = await eventsWriteHandler({
    eventSearchClient,
    input: {
      ...eventInput,
      event_id: eventId,
      status: eventInput.status ?? 'active',
    },
    logger,
  });
  if (!result.written) {
    throw createBulkWriteOutcomeUnknownError(
      `Event write skipped (${result.reason}): event_id=${result.event_id}`
    );
  }
  // A freshly generated event_id has no stored version, so the write can only have created one.
  if (!result.created) {
    throw createBulkWriteOutcomeUnknownError(
      `Event write updated a stored event for a generated event_id: event_id=${eventId}`
    );
  }
  return { event_id: result.event_id, group_hash: result.group_hash, acknowledged: true };
}
