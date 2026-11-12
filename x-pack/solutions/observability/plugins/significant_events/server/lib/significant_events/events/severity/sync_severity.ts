/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { Severity } from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../rule_events_client';
import {
  loadInvestigationOutcomes,
  type InvestigationOutcomesResult,
  type InvestigationsReader,
} from './investigation_outcome';

type SeveritySyncEventClient = Pick<RuleEventsClient, 'findEpisodeIdsByEventIds' | 'syncSeverity'>;

interface SeveritySyncArgs {
  request: KibanaRequest;
  eventClient: SeveritySyncEventClient;
}

/**
 * Keeps the stored severity of an event in step with its investigation, which owns it once it has
 * recorded its findings. The investigation's outcome is the source of truth and the stored severity
 * is a copy, refreshed when the investigation agent finishes (`syncEvents`) and when a read finds a
 * row stale (`reconcileRows`).
 */
export interface SeveritySync {
  /**
   * For a read: returns the rows with the severity their investigations concluded, and refreshes the
   * stored rows that were stale in the background. It never throws and never waits for the write.
   * While the investigations cannot be read the rows come back as they are.
   */
  reconcileRows: <T extends { event_id: string; severity: Severity }>(
    args: SeveritySyncArgs & { rows: T[] }
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
    args: SeveritySyncArgs & { events: Array<{ eventId: string; storedSeverity: Severity }> }
  ) => Promise<Map<string, Severity>>;
}

const MAX_WRITES_PER_READ = 20;
const WRITE_CONCURRENCY = 3;
/** How long an event whose write did not land is left alone, so a failing one is not retried on each view. */
const COOLDOWN_MS = 60_000;
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
  // Event ids are unique across spaces, so the id alone keys the state below.
  const inFlight = new Set<string>();
  const coolingDownUntil = new Map<string, number>();
  const lastWarnedAt = new Map<string, number>();

  const load = ({
    request,
    eventClient,
    eventIds,
    timeoutMs,
  }: SeveritySyncArgs & { eventIds: string[]; timeoutMs?: number }) =>
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

  const pruneCooldowns = () => {
    const now = Date.now();
    coolingDownUntil.forEach((until, eventId) => {
      if (until <= now) coolingDownUntil.delete(eventId);
    });
  };

  /** Writes a read's stale rows in small concurrent groups. Never throws. */
  const writeStale = async ({
    eventClient,
    stale,
  }: {
    eventClient: Pick<RuleEventsClient, 'syncSeverity'>;
    stale: Map<string, Severity>;
  }): Promise<void> => {
    const pending = [...stale]
      .filter(([eventId]) => !inFlight.has(eventId) && !coolingDownUntil.has(eventId))
      .slice(0, MAX_WRITES_PER_READ);
    pending.forEach(([eventId]) => inFlight.add(eventId));

    const failures: string[] = [];
    for (const group of chunk(pending, WRITE_CONCURRENCY)) {
      await Promise.all(
        group.map(async ([eventId, severity]) => {
          try {
            const writeResult = await eventClient.syncSeverity({ eventId, severity });
            if (writeResult === 'superseded' || writeResult === 'not_found') {
              coolingDownUntil.set(eventId, Date.now() + COOLDOWN_MS);
            }
          } catch (error) {
            coolingDownUntil.set(eventId, Date.now() + COOLDOWN_MS);
            failures.push(error instanceof Error ? error.message : String(error));
          } finally {
            inFlight.delete(eventId);
          }
        })
      );
    }
    if (failures.length) {
      log.warn(`Could not write the severity of ${failures.length} event(s): ${failures[0]}`);
    }
  };

  return {
    reconcileRows: async ({ rows, request, eventClient }) => {
      pruneCooldowns();
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

      const stale = new Map<string, Severity>();
      const reconciled = rows.map((row) => {
        const concluded = loaded.outcomes.get(row.event_id)?.severity;
        if (!concluded || concluded === row.severity) return row;
        stale.set(row.event_id, concluded);
        return { ...row, severity: concluded };
      });
      if (stale.size) void writeStale({ eventClient, stale });
      return reconciled;
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
            if (writeResult === 'superseded' || writeResult === 'not_found') {
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
