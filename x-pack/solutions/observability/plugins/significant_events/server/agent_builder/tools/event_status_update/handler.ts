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
  eventUuid,
  status,
  alertEventsClient,
  logger,
}: {
  eventClient: EventClient;
  eventUuid: string;
  status: SignificantEventStatus;
  alertEventsClient?: AlertEventsClientApi;
  logger: Logger;
}): Promise<{
  event_uuid: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> {
  return updateSignificantEventStatus({
    eventClient,
    eventUuid,
    status,
    alertEventsClient,
    logger,
  });
}
