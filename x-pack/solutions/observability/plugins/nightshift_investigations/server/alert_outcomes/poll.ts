/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { NightshiftTelemetryClient } from '../telemetry';
import { getProviderAdapter, type AdapterContext } from './adapters';
import type { AlertOutcomeTrackingStore, StoredTrackingRecord } from './tracking_store';
import type { AlertOutcomeSource, CheckResult, StopReason } from './types';

/** Matches the failure sweep's schedule: the first check is the sweep after round 1. */
export const POLL_INTERVAL_MS = 5 * 60_000;
export const HARD_CAP_MS = 7 * 24 * 60 * 60_000;
export const MAX_CONSECUTIVE_FAILURES = 5;
const DUE_BATCH_SIZE = 200;

export interface PollAlertOutcomesDeps {
  trackingStore: AlertOutcomeTrackingStore;
  isEnabled: () => boolean;
  adapterContext: AdapterContext;
  /** Open or closed per investigation; ids that do not exist or are not readable are missing. */
  getInvestigationStatuses: (ids: string[]) => Promise<Map<string, 'open' | 'closed'>>;
  telemetry?: NightshiftTelemetryClient;
  logger: Logger;
  now?: () => number;
}

export interface PollAlertOutcomesResult {
  checked: number;
  recovered: number;
  stopped: number;
  errors: number;
  timed_out: boolean;
  skipped?: 'disabled';
}

type CheckCounts = Record<
  'checked' | 'firing' | 'recovered' | 'stale' | 'unknown' | 'errors',
  number
>;

const secondsBetween = (from: string | undefined, to: number): number | undefined => {
  const start = from ? Date.parse(from) : NaN;
  return Number.isNaN(start) ? undefined : Math.max(0, Math.round((to - start) / 1000));
};

/**
 * Checks the space's due tracking records against their sources, read-only and without an LLM,
 * and records recoveries. Stops at `deadline`; the oldest checks go first, so the next run
 * resumes where this one stopped.
 */
export const pollAlertOutcomes = async (
  deps: PollAlertOutcomesDeps,
  {
    spaceId,
    deadline,
    abortSignal,
  }: { spaceId: string; deadline: number; abortSignal?: AbortSignal }
): Promise<PollAlertOutcomesResult> => {
  const { trackingStore, telemetry, logger } = deps;
  const clock = deps.now ?? Date.now;
  const result: PollAlertOutcomesResult = {
    checked: 0,
    recovered: 0,
    stopped: 0,
    errors: 0,
    timed_out: false,
  };
  const hasTime = () => {
    if (abortSignal?.aborted || clock() >= deadline) {
      result.timed_out = true;
      return false;
    }
    return true;
  };
  if (!deps.isEnabled()) return { ...result, skipped: 'disabled' };

  const stop = async (stored: StoredTrackingRecord, reason: StopReason, at: number) => {
    const updated = await trackingStore.update(stored, {
      state: 'stopped',
      stop_reason: reason,
      updated_at: new Date(at).toISOString(),
    });
    if (!updated) return;
    result.stopped++;
    telemetry?.reportAlertOutcome({
      transition: 'stopped',
      reason,
      ...(stored.record.source ? { source: stored.record.source } : {}),
      ...(stored.record.automation_id ? { automation_id: stored.record.automation_id } : {}),
      ...(secondsBetween(stored.record.post_received_at, at) !== undefined
        ? { tracked_seconds: secondsBetween(stored.record.post_received_at, at) }
        : {}),
    });
  };

  const markRecovered = async (stored: StoredTrackingRecord, check: CheckResult, at: number) => {
    const iso = new Date(at).toISOString();
    const updated = await trackingStore.update(stored, {
      state: 'recovered',
      recovered_seen_at: iso,
      last_status: 'recovered',
      last_checked_at: iso,
      updated_at: iso,
    });
    if (!updated) return;
    result.recovered++;
    const lag = check.status === 'recovered' ? secondsBetween(check.recovered_at, at) : undefined;
    const tracked = secondsBetween(stored.record.post_received_at, at);
    telemetry?.reportAlertOutcome({
      transition: 'recovered',
      ...(stored.record.source ? { source: stored.record.source } : {}),
      ...(stored.record.automation_id ? { automation_id: stored.record.automation_id } : {}),
      ...(lag !== undefined ? { detection_lag_seconds: lag } : {}),
      ...(tracked !== undefined ? { tracked_seconds: tracked } : {}),
    });
  };

  try {
    const due = await trackingStore.findDue({
      spaceId,
      now: new Date(clock()).toISOString(),
      size: DUE_BATCH_SIZE,
    });
    if (due.length === 0) return result;
    const statuses = await deps.getInvestigationStatuses(
      due.map(({ record }) => record.investigation_id)
    );

    const checkable = new Map<AlertOutcomeSource, StoredTrackingRecord[]>();
    for (const stored of due) {
      const at = clock();
      const status = statuses.get(stored.record.investigation_id);
      if (status !== 'open') {
        await stop(stored, 'investigation_closed', at);
      } else if (at - Date.parse(stored.record.post_received_at) > HARD_CAP_MS) {
        await stop(stored, 'expired', at);
      } else if (stored.record.ref) {
        const { source } = stored.record.ref;
        checkable.set(source, [...(checkable.get(source) ?? []), stored]);
      }
    }

    for (const [source, records] of checkable) {
      if (!hasTime()) break;
      const adapter = getProviderAdapter(source);
      if (!adapter) continue;
      const checks = await adapter.check(
        records.map(({ record }) => record.ref!),
        deps.adapterContext,
        clock()
      );
      const counts: CheckCounts = {
        checked: 0,
        firing: 0,
        recovered: 0,
        stale: 0,
        unknown: 0,
        errors: 0,
      };
      for (const stored of records) {
        if (!hasTime()) break;
        const at = clock();
        const iso = new Date(at).toISOString();
        const check: CheckResult = checks.get(stored.record.ref!.alert_uuid) ?? {
          status: 'unknown',
        };
        counts.checked++;
        result.checked++;
        const next = new Date(at + POLL_INTERVAL_MS).toISOString();
        switch (check.status) {
          case 'firing':
            counts.firing++;
            await trackingStore.update(stored, {
              last_status: 'firing',
              last_checked_at: iso,
              last_firing_at: iso,
              next_check_at: next,
              consecutive_failures: 0,
              updated_at: iso,
            });
            break;
          case 'recovered':
            counts.recovered++;
            await markRecovered(stored, check, at);
            break;
          case 'stale':
            counts.stale++;
            await stop(stored, 'stale', at);
            break;
          case 'unknown':
            counts.unknown++;
            if (check.stop) {
              await stop(stored, check.stop, at);
            } else {
              await trackingStore.update(stored, {
                last_status: 'unknown',
                last_checked_at: iso,
                next_check_at: next,
                consecutive_failures: 0,
                updated_at: iso,
              });
            }
            break;
          case 'error': {
            counts.errors++;
            result.errors++;
            const failures = stored.record.consecutive_failures + 1;
            if (failures >= MAX_CONSECUTIVE_FAILURES) {
              await stop(stored, 'access_lost', at);
            } else {
              await trackingStore.update(stored, {
                last_status: 'error',
                last_checked_at: iso,
                next_check_at: next,
                consecutive_failures: failures,
                updated_at: iso,
              });
            }
            logger.debug(
              `Alert outcome check failed for investigation "${stored.record.investigation_id}" (${failures}/${MAX_CONSECUTIVE_FAILURES}): ${check.message}`
            );
            break;
          }
        }
      }
      telemetry?.reportAlertOutcomeChecks({ source, ...counts });
    }
  } catch (error) {
    result.errors++;
    logger.warn(
      `Alert outcome polling failed in space ${spaceId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return result;
};
