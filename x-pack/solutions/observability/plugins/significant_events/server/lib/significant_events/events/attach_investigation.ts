/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { SignificantEventInvestigation } from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';

export const attachInvestigationToEvent = async ({
  eventClient,
  eventId,
  investigation,
}: {
  eventClient: EventClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findByEventId(eventId);
  const latest = hits[hits.length - 1];

  if (!latest) {
    return { event_uuid: eventId, updated: 0, ignored: 1 };
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
    investigations = existing;
  }

  if (isEqual(investigations, existing)) {
    return { event_uuid: latest.event_uuid, updated: 0, ignored: 1 };
  }

  const now = new Date().toISOString();
  const nextEventUuid = uuidv4();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    event_uuid: nextEventUuid,
    previous_event_uuid: latest.event_uuid,
    investigations,
    workflow_execution_id: investigation.workflow_execution_id,
  };

  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true });

  emitSignificantEventWriteTriggers({
    eventClient,
    significantEvent: updatedEvent,
    priorSignificantEvent: latest,
  });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0 };
};
