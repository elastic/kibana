/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import type { EventClient } from '../../../lib/significant_events/events';

export async function updateEventStatusToolHandler({
  eventClient,
  eventId,
  status,
  alertEventsClient,
  logger,
}: {
  eventClient: EventClient;
  eventId: string;
  status: SignificantEventStatus;
  alertEventsClient?: AlertEventsClientApi;
  logger: Logger;
}): Promise<{
  event_id: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> {
  const result = await updateSignificantEventStatus({
    eventClient,
    eventId,
    status,
    alertEventsClient,
    logger,
  });

  return { event_id: eventId, ...result };
}
