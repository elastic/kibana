/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { SignificantEventInvestigation } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { RuleEventsClient } from './rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

export const attachInvestigationToEvent = async ({
  eventSearchClient,
  eventId,
  investigation,
  alertEventsClient,
  emitTrigger,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  logger?: Logger;
}): Promise<{ updated: number; ignored: number }> => {
  const latest = await eventSearchClient.findLatestByEventId(eventId);

  if (!latest) {
    return { updated: 0, ignored: 1 };
  }

  const existing = latest.investigations ?? [];

  // Replace-by-workflow_execution_id: completion events are safe to redeliver.
  const existingIdx = existing.findIndex(
    (i) => i.workflow_execution_id === investigation.workflow_execution_id
  );

  let investigations: SignificantEventInvestigation[];
  if (existingIdx !== -1) {
    investigations = existing.map((entry, idx) => (idx === existingIdx ? investigation : entry));
  } else if (existing.length < 100) {
    investigations = [...existing, investigation];
  } else {
    // At the schema-enforced 100-entry cap, do not exceed investigations.max(100).
    logger?.warn(
      `attach_investigation: investigation cap (100) reached for event_id "${eventId}"; new investigation entry dropped`
    );
    investigations = existing;
  }

  if (isEqual(investigations, existing)) {
    return { updated: 0, ignored: 1 };
  }

  const now = new Date().toISOString();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    investigations,
    workflow_execution_id: investigation.workflow_execution_id,
  };

  await alertEventsClient.createAlertEvent(toRuleEvent(updatedEvent));

  emitSignificantEventWriteTriggers({
    emitTrigger,
    significantEvent: updatedEvent,
    priorSignificantEvent: latest,
  });

  return { updated: 1, ignored: 0 };
};
