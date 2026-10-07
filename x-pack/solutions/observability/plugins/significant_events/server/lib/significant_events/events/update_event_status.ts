/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus, Severity } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { RuleEventsClient } from './rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

export const updateSignificantEventStatus = async ({
  eventSearchClient,
  eventId,
  status,
  assessmentNote,
  severity,
  alertEventsClient,
  emitTrigger,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  status: SignificantEventStatus;
  assessmentNote?: string;
  severity?: Severity;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
}): Promise<{
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> => {
  const latest = await eventSearchClient.findLatestByEventId(eventId);

  if (!latest) {
    return { updated: 0, ignored: 1, status };
  }

  const note = assessmentNote?.trim();

  if (
    latest.status === status &&
    (severity === undefined || latest.severity === severity) &&
    (!note || latest.assessment_note === note)
  ) {
    return { updated: 0, ignored: 1, status };
  }

  const now = new Date().toISOString();
  // A blank note counts as omitted, so it cannot overwrite the existing one.
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    status,
    ...(severity !== undefined ? { severity } : {}),
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

  return { updated: 1, ignored: 0, status };
};
