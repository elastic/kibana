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
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { EventClient } from './event_client';
import type { SignificantEventsReadClient } from './read_client';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

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
  eventSearchClient,
  eventId,
  investigation,
  triggerFeedback,
  alertEventsClient,
  logger,
}: {
  /** Full-surface EventClient — all writes and canonical lineage reads go here. */
  eventClient: EventClient;
  /**
   * Flag-aware read surface (`getEventSearchClient()`). When provided, `resolvedSearchClient`
   * uses this for the initial read; canonical lineage (previous_event_uuid, investigations) is
   * always sourced from `eventClient`. Defaults to `eventClient` for legacy tests. Production
   * callers must always supply this.
   */
  eventSearchClient?: SignificantEventsReadClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
  triggerFeedback?: SignificantEventTriggerFeedback;
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  const resolvedSearchClient = eventSearchClient ?? eventClient;
  const { hits } = await resolvedSearchClient.findByEventId(eventId);
  const latest = hits[hits.length - 1];

  if (!latest) {
    return { event_uuid: eventId, updated: 0, ignored: 1 };
  }

  // RuleEventsClient uses `group_hash` as a synthetic event_uuid, so a legacy write must retain
  // the actual EventClient version as its predecessor.
  const latestLegacy =
    resolvedSearchClient === eventClient
      ? latest
      : (await eventClient.findByEventId(eventId)).hits.at(-1);
  if (!latestLegacy) {
    return { event_uuid: eventId, updated: 0, ignored: 1 };
  }

  const existing = latestLegacy.investigations ?? [];

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
    latestLegacy,
    fieldsFromTriggerFeedback(latestLegacy, triggerFeedback, eventId, logger)
  );

  // No-op only when neither the investigation list nor any reassessed field actually changed.
  if (isEqual(investigations, existing) && Object.keys(changedFields).length === 0) {
    return { event_uuid: latestLegacy.event_uuid, updated: 0, ignored: 1 };
  }

  const now = new Date().toISOString();
  const nextEventUuid = uuidv4();
  const updatedEvent = {
    ...latestLegacy,
    '@timestamp': now,
    event_uuid: nextEventUuid,
    previous_event_uuid: latestLegacy.event_uuid,
    investigations,
    workflow_execution_id: investigation.workflow_execution_id,
    ...changedFields,
  };

  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true });

  alertEventsClient
    ?.createAlertEvent(toRuleEvent(updatedEvent))
    .catch((err) =>
      logger?.error(
        `attach_investigation dual-write to .rule-events failed: ${
          err instanceof Error ? err.message : err
        }`
      )
    );

  emitSignificantEventWriteTriggers({
    eventClient,
    significantEvent: updatedEvent,
    priorSignificantEvent: latestLegacy,
  });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0 };
};
