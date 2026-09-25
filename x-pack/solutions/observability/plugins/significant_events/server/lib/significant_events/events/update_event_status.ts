/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { EventClient } from './event_client';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

export const updateSignificantEventStatus = async ({
  eventClient,
  eventId,
  status,
  assessmentNote,
  alertEventsClient,
  logger,
}: {
  eventClient: EventClient;
  eventId: string;
  status: SignificantEventStatus;
  assessmentNote?: string;
  /** Optional — callers must attempt to pass in production; omitted only when client is unavailable or in legacy tests. */
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<{
  /** The written or matched version's event_uuid — absent when no event was found for eventId. */
  event_uuid?: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> => {
  const latest = await eventClient.findLatestByEventId(eventId);

  if (!latest) {
    return { updated: 0, ignored: 1, status };
  }

  if (latest.status === status) {
    return { event_uuid: latest.event_uuid, updated: 0, ignored: 1, status };
  }

  const nextEventUuid = uuidv4();
  const now = new Date().toISOString();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    event_uuid: nextEventUuid,
    previous_event_uuid: latest.event_uuid,
    status,
    ...(assessmentNote !== undefined ? { assessment_note: assessmentNote } : {}),
  };

  // `wait_for` ensures the write is searchable before this resolves, so an immediate
  // re-fetch (e.g. the UI invalidating its query right after this route responds) sees it.
  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true, refresh: 'wait_for' });

  // Dual-write to .rule-events (fire-and-forget). Errors are logged but never affect the result.
  alertEventsClient?.createAlertEvent(toRuleEvent(updatedEvent)).catch((err) => {
    logger?.error(`Failed to write to .rule-events: ${err instanceof Error ? err.message : err}`);
  });

  // Notify subscribed workflows of the status change (fire-and-forget).
  emitSignificantEventWriteTriggers({
    eventClient,
    significantEvent: updatedEvent,
    priorSignificantEvent: latest,
  });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0, status };
};
