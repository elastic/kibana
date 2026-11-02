/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventManualStatus } from '@kbn/significant-events-schema';
import type {
  RuleEventsClient,
  UpdateEventStatusResult,
} from '../../../lib/significant_events/events/rule_events_client';
import { StatusChange } from '../../../lib/significant_events/events/lifecycle/lifecycle_controller';

export async function updateEventStatusToolHandler({
  eventSearchClient,
  eventId,
  status,
  assessmentNote,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  status: SignificantEventManualStatus;
  assessmentNote?: string;
}): Promise<{ event_id: string } & UpdateEventStatusResult> {
  const result = await eventSearchClient.updateEventStatus({
    eventId,
    change: StatusChange.byOperator(status),
    assessmentNote,
  });

  return { event_id: eventId, ...result };
}
