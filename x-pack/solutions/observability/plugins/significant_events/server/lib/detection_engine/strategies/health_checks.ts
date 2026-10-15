/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  bucketStarts,
  esqlString,
  field,
  listColumns,
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql_helpers';
import type {
  IDetectionStrategy,
  StrategyContext,
  StrategyEvaluation,
  StrategyObservation,
} from './types';

/** How far back silence and latency look for "what this service usually does". */
const REFERENCE_WINDOW_MS = 60 * 60_000;
const ERROR_RATIO_TRIGGER = 0.05;
/** Below this, a few chance errors in a quiet bucket would look like a spike. */
const MIN_ERRORS = 5;
const LATENCY_TRIGGER_FACTOR = 2;
const SILENCE_MIN_EXPECTED_DOCS = 5;
const SILENCE_TRIGGER_DROP = 0.9;
const NANOS_PER_MS = 1_000_000;

interface BucketStats {
  total: number;
  errors: number;
  p95Ms?: number;
}

function buildErrorCondition(columns: string[]): string | undefined {
  const conditions = [
    columns.includes('log.level')
      ? `TO_LOWER(${field('log.level')}) IN ("error", "critical", "fatal")`
      : undefined,
    columns.includes('http.response.status_code')
      ? `${field('http.response.status_code')} >= 500`
      : undefined,
  ].filter((condition): condition is string => condition !== undefined);
  return conditions.length > 0 ? conditions.join(' OR ') : undefined;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
}

async function evaluateSource(
  source: NightshiftSource,
  context: StrategyContext
): Promise<StrategyEvaluation> {
  const view = source.view_name;
  const columns = await listColumns(context.dataEsClient, view);
  if (!columns.includes('service.name')) {
    return { observations: [], notes: [`${source.title}: no service.name field, skipped`] };
  }

  const errorCondition = buildErrorCondition(columns);
  const hasDuration = columns.includes('event.duration');
  const lookbackFrom = context.from - REFERENCE_WINDOW_MS;
  const bucketMinutes = Math.round(context.bucketMs / 60_000);

  const stats = [
    'total = COUNT(*)',
    errorCondition ? `errors = SUM(CASE(${errorCondition}, 1, 0))` : undefined,
    hasDuration ? `p95 = PERCENTILE(${field('event.duration')}, 95)` : undefined,
  ].filter(Boolean);

  const { rows } = await queryRows(
    context.dataEsClient,
    `FROM ${view}
| WHERE ${timeRangeWhere(lookbackFrom, context.to)} AND ${field('service.name')} IS NOT NULL
| STATS ${stats.join(', ')} BY service = ${field(
      'service.name'
    )}, bucket = BUCKET(@timestamp, ${bucketMinutes} minute)
| LIMIT 10000`
  );

  // service -> bucket start -> stats; services seen anywhere in the window are watched.
  const byService = new Map<string, Map<number, BucketStats>>();
  rows.forEach((row) => {
    const service = String(row.service);
    const buckets = byService.get(service) ?? new Map<number, BucketStats>();
    const p95 = row.p95 === null || row.p95 === undefined ? undefined : toNumber(row.p95);
    buckets.set(toEpoch(row.bucket), {
      total: toNumber(row.total),
      errors: toNumber(row.errors),
      p95Ms: p95 === undefined ? undefined : p95 / NANOS_PER_MS,
    });
    byService.set(service, buckets);
  });

  const evaluated = bucketStarts(context.from, context.to, context.bucketMs);

  const observations = [...byService.entries()].flatMap(([service, buckets]) =>
    evaluated.flatMap((bucketStart): StrategyObservation[] => {
      const bucketEnd = bucketStart + context.bucketMs;
      const reference = [...buckets.entries()].filter(
        ([start]) => start < bucketStart && start >= bucketStart - REFERENCE_WINDOW_MS
      );
      const current = buckets.get(bucketStart) ?? { total: 0, errors: 0 };
      const serviceWhere = `${field('service.name')} == ${esqlString(service)}`;
      const results: StrategyObservation[] = [];

      if (reference.length > 0) {
        const expected =
          reference.reduce((sum, [, bucket]) => sum + bucket.total, 0) / reference.length;
        if (expected >= SILENCE_MIN_EXPECTED_DOCS) {
          const drop = Math.max(0, 1 - current.total / expected);
          results.push({
            fingerprint: `health:silence:${source.id}:${service}`,
            service,
            bucket_start: bucketStart,
            value: drop,
            unit: 'drop',
            looks_off: drop >= SILENCE_TRIGGER_DROP,
            title: `${service} went quiet`,
            description: `${current.total} documents in the bucket; about ${Math.round(
              expected
            )} expected from the previous hour.`,
            importance: 70,
            evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 30 * 60_000, bucketEnd)} AND ${serviceWhere}
| STATS docs = COUNT(*) BY bucket = BUCKET(@timestamp, ${bucketMinutes} minute)
| SORT bucket DESC
| LIMIT 30`,
            source_id: source.id,
          });
        }
      }

      if (errorCondition && current.total > 0) {
        const ratio = current.errors / current.total;
        results.push({
          fingerprint: `health:error_ratio:${source.id}:${service}`,
          service,
          bucket_start: bucketStart,
          value: ratio,
          unit: 'ratio',
          looks_off: ratio >= ERROR_RATIO_TRIGGER && current.errors >= MIN_ERRORS,
          title: `${service} error ratio is ${Math.round(ratio * 100)}%`,
          description: `${current.errors} of ${current.total} documents are errors.`,
          importance: Math.min(95, Math.round(50 + ratio * 100)),
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart, bucketEnd)} AND ${serviceWhere} AND (${errorCondition})
| SORT @timestamp DESC
| LIMIT 20`,
          source_id: source.id,
        });
      }

      if (current.p95Ms !== undefined) {
        const referenceLatency = median(
          reference.flatMap(([, bucket]) => (bucket.p95Ms === undefined ? [] : [bucket.p95Ms]))
        );
        results.push({
          fingerprint: `health:latency_p95:${source.id}:${service}`,
          service,
          bucket_start: bucketStart,
          value: current.p95Ms,
          unit: 'ms',
          looks_off:
            referenceLatency > 0 && current.p95Ms >= referenceLatency * LATENCY_TRIGGER_FACTOR,
          title: `${service} p95 latency is ${Math.round(current.p95Ms)} ms`,
          description: `p95 latency ${Math.round(
            current.p95Ms
          )} ms; the previous hour's median p95 was ${Math.round(referenceLatency)} ms.`,
          importance: 60,
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 15 * 60_000, bucketEnd)} AND ${serviceWhere}
| STATS p95_ms = PERCENTILE(${field(
            'event.duration'
          )}, 95) / ${NANOS_PER_MS} BY bucket = BUCKET(@timestamp, ${bucketMinutes} minute)
| SORT bucket DESC
| LIMIT 15`,
          source_id: source.id,
        });
      }

      return results;
    })
  );

  return { observations, notes: [] };
}

/**
 * Health checks: per-service checks written in code, with no AI. Error ratio, latency and
 * silence. Silence lives here because the baseline check only finds "more than normal", so the
 * strategy turns a drop in traffic into a value that grows when things get worse.
 */
export const healthChecksStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'health_checks',
    name: 'Health checks',
    watches: 'Every service in each logs source: error ratio, p95 latency and traffic',
    reportsWhen:
      'Error ratio at or above 5% with 5+ errors, p95 latency at twice the previous hour, or traffic dropping 90% or more',
    baselinePolicy: 'own_history',
    reportsOnlyFiring: false,
    supportsReplay: true,
  },

  async evaluate(context) {
    const logsSources = context.sources.filter(
      (source) => source.type === 'logs' || source.type === 'unknown'
    );
    const results = await Promise.all(
      logsSources.map((source) =>
        evaluateSource(source, context).catch(
          (error): StrategyEvaluation => ({
            observations: [],
            notes: [`${source.title}: ${error.message}`],
          })
        )
      )
    );
    return {
      observations: results.flatMap((result) => result.observations),
      notes: results.flatMap((result) => result.notes),
    };
  },
};
