/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_EMULATION_ID } from './alert_tagging';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALERTS_INDEX = '.alerts-security.alerts-*';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 60_000;
const ALERT_RULE_NAME_FIELD = 'kibana.alert.rule.name';
/** The detection engine copies `event.module` from the source doc into this alert field. */
const ALERT_ORIGINAL_EVENT_MODULE = 'kibana.alert.original_event.module';
/** Value set by the log-injection generator on every emulation doc. */
const EMULATION_EVENT_MODULE = 'emulation';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CollectTelemetryInput {
  scenarioId: string;
  /** Signal names expected by the scenario — used to compute matched/unmatched sets. */
  expectedSignals: string[];
  /** ISO 8601 timestamp; alerts before this point are excluded. */
  scenarioStartedAt: string;
  /** `poll` queries every 5 s up to 60 s; `one_shot` issues a single query. */
  mode: 'poll' | 'one_shot';
  /** Cancels an in-progress poll when signalled. */
  signal?: AbortSignal;
}

export interface CollectTelemetryDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Defaults to `.alerts-security.alerts-*`. */
  alertsIndex?: string;
}

export interface ObservedAlert {
  alertId: string;
  ruleName: string;
}

export interface TelemetryResult {
  scenarioId: string;
  observedAlerts: ObservedAlert[];
  /** Expected signal names that fired at least once. */
  matchedSignals: string[];
  /** Expected signal names that never fired. */
  unmatchedSignals: string[];
  pollDurationMs: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildQuery = (scenarioId: string, scenarioStartedAt: string) => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: scenarioStartedAt } } },
    ],
    should: [
      // Primary: alerts already tagged with the emulation ID (real_execution
      // path or alerts backfilled by tagAlertsWithEmulation).
      { term: { [ALERT_EMULATION_ID]: scenarioId } },
      // Fallback: alerts whose source event came from the emulation module.
      // The detection engine copies `event.module` from the source doc into
      // `kibana.alert.original_event.module` — this lets the collector
      // discover emulation-sourced alerts without requiring a tagging step.
      { term: { [ALERT_ORIGINAL_EVENT_MODULE]: EMULATION_EVENT_MODULE } },
    ],
    minimum_should_match: 1,
  },
});

const fetchAlerts = async (
  esClient: ElasticsearchClient,
  index: string,
  scenarioId: string,
  scenarioStartedAt: string,
  logger: Logger
): Promise<ObservedAlert[]> => {
  try {
    const response = await esClient.search({
      index,
      size: 1000,
      _source: [ALERT_RULE_NAME_FIELD],
      query: buildQuery(scenarioId, scenarioStartedAt),
    });

    return response.hits.hits.flatMap((hit) => {
      const source = hit._source as Record<string, unknown> | undefined;
      const ruleName = source?.[ALERT_RULE_NAME_FIELD];
      if (typeof ruleName !== 'string' || !hit._id) return [];
      return [{ alertId: hit._id, ruleName }];
    });
  } catch (err) {
    logger.warn(
      `[telemetry_collector] ES search failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
};

// Resolves when the timer fires or the AbortSignal fires — whichever comes first.
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

// ─── Core ─────────────────────────────────────────────────────────────────────

const buildResult = (
  scenarioId: string,
  observedAlerts: ObservedAlert[],
  expectedSignals: string[],
  startMs: number
): TelemetryResult => {
  const firedNames = new Set(observedAlerts.map((a) => a.ruleName));
  return {
    scenarioId,
    observedAlerts,
    matchedSignals: expectedSignals.filter((s) => firedNames.has(s)),
    unmatchedSignals: expectedSignals.filter((s) => !firedNames.has(s)),
    pollDurationMs: Date.now() - startMs,
  };
};

/**
 * Collects Detection Engine alerts produced by a specific emulation run.
 *
 * `one_shot` — single ES query, returns immediately.
 * `poll`     — queries every 5 s up to 60 s; stops early when all expected
 *              signals have fired; honours AbortController cancellation.
 */
export const collectTelemetry = async (
  input: CollectTelemetryInput,
  deps: CollectTelemetryDeps
): Promise<TelemetryResult> => {
  const { scenarioId, expectedSignals, scenarioStartedAt, mode, signal } = input;
  const { esClient, logger, alertsIndex = ALERTS_INDEX } = deps;

  const startMs = Date.now();
  const seenIds = new Set<string>();
  const observedAlerts: ObservedAlert[] = [];

  const accumulate = async () => {
    const fresh = await fetchAlerts(esClient, alertsIndex, scenarioId, scenarioStartedAt, logger);
    for (const alert of fresh) {
      if (!seenIds.has(alert.alertId)) {
        seenIds.add(alert.alertId);
        observedAlerts.push(alert);
      }
    }
  };

  if (mode === 'one_shot') {
    await accumulate();
    return buildResult(scenarioId, observedAlerts, expectedSignals, startMs);
  }

  // poll mode: accumulate across ticks; stop on full match, timeout, or abort.
  const allExpectedFired = () =>
    expectedSignals.length > 0 &&
    expectedSignals.every((s) => observedAlerts.some((a) => a.ruleName === s));

  while (Date.now() - startMs < MAX_POLL_DURATION_MS) {
    if (signal?.aborted) break;
    await accumulate();
    if (allExpectedFired()) break;
    const remaining = MAX_POLL_DURATION_MS - (Date.now() - startMs);
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining), signal);
  }

  return buildResult(scenarioId, observedAlerts, expectedSignals, startMs);
};
