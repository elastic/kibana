/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type {
  Severity,
  SignificantEventInvestigation,
  SignificantEventStatus,
  TriggerFeedback,
} from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';

interface SignificantEventFieldChanges {
  status?: SignificantEventStatus;
  severity?: Severity;
  summary?: string;
}

export type SignificantEventTriggerFeedback = ReadonlyArray<TriggerFeedback>;

/**
 * Narrow a requested field patch to only the attributes that actually differ from the current
 * version, so proposing the current value is a no-op and never writes a redundant version.
 */
const pickChangedFields = (
  current: SignificantEventFieldChanges,
  fields: SignificantEventFieldChanges
): SignificantEventFieldChanges => {
  const changed: SignificantEventFieldChanges = {};
  if (fields.status !== undefined && fields.status !== current.status) {
    changed.status = fields.status;
  }
  if (fields.severity !== undefined && fields.severity !== current.severity) {
    changed.severity = fields.severity;
  }
  if (fields.summary !== undefined && fields.summary !== current.summary) {
    changed.summary = fields.summary;
  }
  return changed;
};

const fieldsFromTriggerFeedback = (
  current: SignificantEventFieldChanges,
  triggerFeedback: SignificantEventTriggerFeedback | undefined,
  eventId: string,
  logger?: Logger
): SignificantEventFieldChanges => {
  const fields: SignificantEventFieldChanges = {};
  const counts = new Map<TriggerFeedback['field'], number>();
  for (const feedback of triggerFeedback ?? []) {
    counts.set(feedback.field, (counts.get(feedback.field) ?? 0) + 1);
  }

  for (const feedback of triggerFeedback ?? []) {
    // Multiple proposals for one field are ambiguous; ignore that field rather than choosing
    // based on array order.
    if (counts.get(feedback.field) !== 1) {
      logger?.warn(
        `Ignoring ambiguous trigger feedback for significant event "${eventId}" field "${feedback.field}"`
      );
      continue;
    }

    const currentValue = current[feedback.field];
    if (currentValue !== feedback.from) {
      logger?.warn(
        `Ignoring stale trigger feedback for significant event "${eventId}" field "${feedback.field}"`
      );
      continue;
    }
    switch (feedback.field) {
      case 'status':
        fields.status = feedback.to;
        break;
      case 'severity':
        fields.severity = feedback.to;
        break;
      case 'summary':
        fields.summary = feedback.to;
        break;
    }
  }
  return fields;
};

export const attachInvestigationToEvent = async ({
  eventClient,
  eventId,
  investigation,
  triggerFeedback,
  logger,
}: {
  eventClient: EventClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
  triggerFeedback?: SignificantEventTriggerFeedback;
  logger?: Logger;
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

  const changedFields = pickChangedFields(
    latest,
    fieldsFromTriggerFeedback(latest, triggerFeedback, eventId, logger)
  );

  // No-op only when neither the investigation list nor any reassessed field actually changed.
  if (isEqual(investigations, existing) && Object.keys(changedFields).length === 0) {
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
    ...changedFields,
  };

  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true });

  emitSignificantEventWriteTriggers({
    eventClient,
    significantEvent: updatedEvent,
    priorSignificantEvent: latest,
  });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0 };
};
