/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';

export const attachEventInvestigationToolHandler = async ({
  eventSearchClient,
  eventId,
  investigationWorkflowExecutionId,
  startedAt,
  completedAt,
  workflowExecutionId,
  alertEventsClient,
  emitTrigger,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  eventId: string;
  investigationWorkflowExecutionId: string;
  startedAt: string;
  completedAt?: string;
  workflowExecutionId?: string;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  logger?: Logger;
}): Promise<{ updated: number; ignored: number }> => {
  const { hits } = await eventSearchClient.findByEventId(eventId);
  if (hits.length === 0) {
    throw new Error(`Significant event "${eventId}" not found`);
  }

  return attachInvestigationToEvent({
    eventSearchClient,
    eventId,
    investigation: {
      workflow_execution_id: investigationWorkflowExecutionId,
      started_at: startedAt,
      completed_at: completedAt,
    },
    workflowExecutionId,
    alertEventsClient,
    emitTrigger,
    logger,
  });
};
