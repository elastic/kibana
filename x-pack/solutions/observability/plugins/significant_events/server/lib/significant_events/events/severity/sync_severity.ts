/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { Severity } from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../rule_events_client';
import {
  loadInvestigationOutcomes,
  type InvestigationOutcomesResult,
  type InvestigationsReader,
} from './investigation_outcome';

type SeveritySyncEventClient = Pick<RuleEventsClient, 'findEpisodeIdsByEventIds' | 'syncSeverity'>;
type SeverityReadClient = Pick<RuleEventsClient, 'findEpisodeIdsByEventIds'>;

interface SeverityReadArgs {
  request: KibanaRequest;
  eventClient: SeverityReadClient;
}

interface SeveritySyncArgs {
  request: KibanaRequest;
  eventClient: SeveritySyncEventClient;
}

/**
 * Keeps the stored severity of an event in step with its investigation, which owns it once it has
 * recorded its findings. The investigation's outcome is the source of truth and the stored severity
 * is a copy. Two writers refresh it: the investigation agent hook (`syncEvents`) and Discovery's
 * event write (`resolveSeverities`, which only reads). Reads never write; `reconcileRows` only shows
 * what the investigation concluded.
 */
export interface SeveritySync {
  /**
   * For display only: returns the rows with the severity their investigations concluded and writes
   * nothing. It never throws. While the investigations cannot be read the rows come back as they are.
   */
  reconcileRows: <T extends { event_id: string; severity: Severity }>(
    args: SeverityReadArgs & { rows: T[] }
  ) => Promise<T[]>;
  /**
   * For the investigation agent hook: writes the severity of the events' investigation outcomes now
   * and returns what the investigations gave, so the caller can retry on a timeout or an error. A
   * failed write is thrown after every event has been tried.
   */
  syncEvents: (
    args: SeveritySyncArgs & { eventIds: string[] }
  ) => Promise<InvestigationOutcomesResult>;
  /**
   * The severity each event should have now: that of its investigation, or its stored one while the
   * investigations cannot be read. An event with no investigation, such as a new one, is left out,
   * so the caller's own severity stands.
   */
  resolveSeverities: (
    args: SeverityReadArgs & { events: Array<{ eventId: string; storedSeverity: Severity }> }
  ) => Promise<Map<string, Severity>>;
}

const WARN_EVERY_MS = 5 * 60_000;
/** A page view cannot wait on a slow read: past this it shows the stored severities. */
const READ_TIMEOUT_MS = 3_000;

export const createSeveritySync = ({
  getAgenticInvestigations,
  logger,
}: {
  getAgenticInvestigations: () => InvestigationsReader | undefined;
  logger: Logger;
}): SeveritySync => {
  const log = logger.get('severitySync');
  const lastWarnedAt = new Map<string, number>();

  const load = ({
    request,
    eventClient,
    eventIds,
    timeoutMs,
  }: {
    request: KibanaRequest;
    eventClient: SeverityReadClient;
    eventIds: string[];
    timeoutMs?: number;
  }) =>
    loadInvestigationOutcomes({
      request,
      eventClient,
      eventIds,
      timeoutMs,
      agenticInvestigations: getAgenticInvestigations(),
      logger: log,
    });

  /** Warns, for each reason at most every 5 minutes, that the stored severities are shown. */
  const warnUnavailable = (reason: string) => {
    const now = Date.now();
    if (now - (lastWarnedAt.get(reason) ?? 0) <= WARN_EVERY_MS) return;
    lastWarnedAt.set(reason, now);
    log.warn(`Showing stored event severities: the investigations are unavailable (${reason})`);
  };

  return {
    reconcileRows: async ({ rows, request, eventClient }) => {
      const loaded = await load({
        request,
        eventClient,
        eventIds: rows.map(({ event_id: eventId }) => eventId),
        timeoutMs: READ_TIMEOUT_MS,
      });
      if (loaded.status === 'unavailable') {
        // Reads are frequent and a viewer without access is normal, so neither a missing plugin nor
        // a forbidden read is worth a warning here, and the others warn at most every 5 minutes.
        if (loaded.reason !== 'not_installed' && loaded.reason !== 'forbidden') {
          warnUnavailable(loaded.reason);
        }
        return rows;
      }
      return rows.map((row) => {
        const concluded = loaded.outcomes.get(row.event_id)?.severity;
        return concluded && concluded !== row.severity ? { ...row, severity: concluded } : row;
      });
    },

    syncEvents: async ({ eventIds, request, eventClient }) => {
      const loaded = await load({ request, eventClient, eventIds });
      if (loaded.status === 'available') {
        // Every event is tried: one failing write must not keep the others from being written. The
        // first error is thrown after the loop so the caller can retry (a rewrite is a no-op).
        let firstError: unknown;
        for (const [eventId, { severity }] of loaded.outcomes) {
          try {
            const writeResult = await eventClient.syncSeverity({ eventId, severity });
            if (writeResult !== 'updated' && writeResult !== 'unchanged') {
              log.debug(`Severity of event ${eventId} not written through (${writeResult})`);
            }
          } catch (error) {
            firstError ??= error;
          }
        }
        if (firstError !== undefined) throw firstError;
      }
      return loaded;
    },

    resolveSeverities: async ({ events, request, eventClient }) => {
      const severities = new Map<string, Severity>();
      const loaded = await load({
        request,
        eventClient,
        eventIds: events.map(({ eventId }) => eventId),
      });
      if (loaded.status === 'available') {
        loaded.outcomes.forEach(({ severity }, eventId) => severities.set(eventId, severity));
        return severities;
      }
      // Discovery runs rarely, and a forbidden read there is a misconfiguration that freezes every
      // severity change, so it warns for any reason except a missing plugin, once per batch.
      if (loaded.reason !== 'not_installed') {
        log.warn(
          `Kept the stored severity of ${events.length} event(s): investigations unavailable (${loaded.reason})`
        );
        events.forEach(({ eventId, storedSeverity }) => severities.set(eventId, storedSeverity));
      }
      return severities;
    },
  };
};
