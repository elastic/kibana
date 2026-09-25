/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import type {
  EventClient,
  SignificantEventsReadClient,
} from '../../../lib/significant_events/events';

export const attachEventInvestigationToolHandler = async ({
  eventClient,
  eventSearchClient,
  eventId,
  workflowExecutionId,
  startedAt,
  completedAt,
  alertEventsClient,
  logger,
}: {
  /** Full-surface EventClient — the existence guard and any writes always go here. */
  eventClient: EventClient;
  /**
   * Flag-aware read surface (`getEventSearchClient()`). Used for the lineage lookup inside
   * `attachInvestigationToEvent`. Defaults to `eventClient` for legacy tests. Production callers
   * must always supply this.
   */
  eventSearchClient?: SignificantEventsReadClient;
  eventId: string;
  workflowExecutionId: string;
  startedAt: string;
  completedAt?: string;
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findByEventId(eventId);
  if (hits.length === 0) {
    throw new Error(`Significant event "${eventId}" not found`);
  }

  return attachInvestigationToEvent({
    eventClient,
    eventSearchClient,
    eventId,
    investigation: {
      workflow_execution_id: workflowExecutionId,
      started_at: startedAt,
      completed_at: completedAt,
    },
    alertEventsClient,
    logger,
  });
};
