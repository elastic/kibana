/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEventManualStatus,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import { applyLifecycleInput } from '../../../lib/significant_events/events/lifecycle_controller';
import { operatorInputFor } from '../../../lib/significant_events/events/lifecycle_state_machine';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';

export async function updateEventStatusToolHandler({
  eventSearchClient,
  eventId,
  status,
  assessmentNote,
  alertEventsClient,
  emitTrigger,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  status: SignificantEventManualStatus;
  assessmentNote?: string;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
}): Promise<{
  event_id: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> {
  const result = await applyLifecycleInput({
    eventSearchClient,
    eventId,
    input: operatorInputFor(status),
    assessmentNote,
    alertEventsClient,
    emitTrigger,
  });

  return { event_id: eventId, ...result };
}
