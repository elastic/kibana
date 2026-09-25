/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { SignificantEventInvestigation } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { EventClient } from './event_client';
import type { SignificantEventsReadClient } from './read_client';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { toRuleEvent } from './to_rule_event';

export const attachInvestigationToEvent = async ({
  eventClient,
  eventSearchClient,
  eventId,
  investigation,
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
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  const resolvedSearchClient = eventSearchClient ?? eventClient;
  const { hits } = await resolvedSearchClient.findLatestByEventId(eventId);
  const latest = hits[hits.length - 1];

  if (!latest) {
    return { updated: 0, ignored: 1 };
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

  if (isEqual(investigations, existing)) {
    return { event_uuid: latest.event_uuid, updated: 0, ignored: 1 };
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
