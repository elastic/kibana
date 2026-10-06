/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type {
  SignificantEventInvestigation,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { EventClient } from './event_client';
import type { SignificantEventsReadClient } from './event_client';
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
   * uses this for the initial read; canonical investigations are always sourced from `eventClient`.
   * Defaults to `eventClient` for legacy tests. Production callers must always supply this.
   */
  eventSearchClient?: SignificantEventsReadClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<{ updated: number; ignored: number }> => {
  const resolvedSearchClient = eventSearchClient ?? eventClient;
  let latestByEventId: SignificantEventResponse | undefined;
  let readStoreThrew = false;
  try {
    latestByEventId = await resolvedSearchClient.findLatestByEventId(eventId);
  } catch (err) {
    readStoreThrew = true;
    logger?.warn(
      `attach_investigation: read-store lookup failed, falling back to canonical client: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // Dual-write lag guard: when the flag-aware read store returns nothing *or throws*, fall back
  // to the canonical eventClient. An empty or errored read-store result is not proof of absence —
  // the dual-write to `.rule-events` can lag behind a successful legacy write, or the read store
  // may be temporarily unavailable.
  const usedLegacyFallback =
    (latestByEventId === undefined || readStoreThrew) && eventSearchClient !== undefined;
  const latest = usedLegacyFallback
    ? await eventClient.findLatestByEventId(eventId)
    : latestByEventId;

  if (!latest) {
    return { updated: 0, ignored: 1 };
  }

  // RuleEventsClient uses `group_hash` as a synthetic identifier, so writes must source the
  // current canonical event from EventClient.
  // If we already fell back to eventClient above, reuse that result — no second round-trip needed.
  const latestLegacy =
    usedLegacyFallback || resolvedSearchClient === eventClient
      ? latest
      : await eventClient.findLatestByEventId(eventId);

  if (!latestLegacy) {
    // The event exists in the read store (resolvedSearchClient) but not in the write store
    // (eventClient) — most likely a dual-write lag race. Surface a retryable error so the caller
    // can distinguish this from a genuine not-found.
    throw new Error(
      `Significant event "${eventId}" exists in the read store but not the write store — possible dual-write lag, retry later`
    );
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
    logger?.warn(
      `attach_investigation: investigation cap (100) reached for event_id "${eventId}"; new investigation entry dropped`
    );
    investigations = existing;
  }

  if (isEqual(investigations, existing)) {
    return { updated: 0, ignored: 1 };
  }

  const now = new Date().toISOString();
  const updatedEvent = {
    ...latestLegacy,
    '@timestamp': now,
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

  return { updated: 1, ignored: 0 };
};
