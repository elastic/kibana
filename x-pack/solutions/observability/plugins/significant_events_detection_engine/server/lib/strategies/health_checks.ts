/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  bucketStarts,
  esqlString,
  field,
  listColumns,
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
  toOptionalNumber,
  type EsqlRow,
} from '../esql';
import { buildSignalRule } from './rule_definitions';
import { latestRowPerKey } from './rule_events_reader';
import type {
  DesiredRules,
  IDetectionStrategy,
  ReplayContext,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'Health checks';
/** How far back silence and latency look for "what this service usually does". */
const REFERENCE_WINDOW_MS = HOUR_MS;
const REFERENCE_SAMPLES = REFERENCE_WINDOW_MS / BUCKET_MS;
const ERROR_RATIO_TRIGGER = 0.05;
/** Below this, a few chance errors in a quiet bucket would look like a spike. */
const MIN_ERRORS = 5;
/**
 * Warnings are noisier than errors, so the trigger is higher; the baseline check then compares
 * with the service's own warning ratio, so a service that always warns stays quiet.
 */
const WARNING_RATIO_TRIGGER = 0.1;
const MIN_WARNINGS = 10;
const LATENCY_TRIGGER_FACTOR = 2;
const SILENCE_MIN_EXPECTED_DOCS = 5;
const SILENCE_TRIGGER_DROP = 0.9;
const NANOS_PER_MS = 1_000_000;
/** The rule runs every minute and re-emits its last three closed buckets, to ride out a late run. */
const RULE_EVERY = '1m';
const RULE_LOOKBACK = '4m';
const RULE_CLOSED_BUCKETS = 3;
/** Rows one replay query may return; one row per service and minute. */
const REPLAY_ROW_LIMIT = 10_000;

/** The fields a source offers that the checks can use. */
interface SourceShape {
  errorCondition?: string;
  warningCondition?: string;
  hasDuration: boolean;
}

/** Counts of one service in one bucket. */
interface BucketStats {
  total: number;
  errors?: number;
  warnings?: number;
  p95Ms?: number;
}

export const trafficFingerprint = (sourceId: string, service: string) =>
  `health:traffic:${sourceId}:${service}`;
const latencyFingerprint = (sourceId: string, service: string) =>
  `health:latency_p95:${sourceId}:${service}`;

/** OpenTelemetry logs carry the level in `severity_text` when nothing maps it to `log.level`. */
function levelField(columns: string[]): string | undefined {
  return ['log.level', 'severity_text'].find((name) => columns.includes(name));
}

function buildWarningCondition(columns: string[]): string | undefined {
  const level = levelField(columns);
  return level ? `TO_LOWER(${field(level)}) IN ("warn", "warning")` : undefined;
}

function buildErrorCondition(columns: string[]): string | undefined {
  const level = levelField(columns);
  const conditions = [
    level ? `TO_LOWER(${field(level)}) IN ("error", "critical", "fatal")` : undefined,
    columns.includes('http.response.status_code')
      ? `${field('http.response.status_code')} >= 500`
      : undefined,
  ].filter((condition): condition is string => condition !== undefined);
  return conditions.length > 0 ? conditions.join(' OR ') : undefined;
}

/** Reads the source's columns; undefined when it has no service to group by. */
async function readShape(
  esClient: ElasticsearchClient,
  source: NightshiftSource,
  signal: AbortSignal
): Promise<SourceShape | undefined> {
  const columns = await listColumns({ esClient, from: source.view_name, signal });
  if (!columns.includes('service.name')) {
    return undefined;
  }
  return {
    errorCondition: buildErrorCondition(columns),
    warningCondition: buildWarningCondition(columns),
    hasDuration: columns.includes('event.duration'),
  };
}

/** The aggregation both the rule and replay run, one row per service and minute. */
function statsPipeline(shape: SourceShape): string {
  const stats = [
    'total = COUNT(*)',
    shape.errorCondition ? `errors = SUM(CASE(${shape.errorCondition}, 1, 0))` : undefined,
    shape.warningCondition ? `warnings = SUM(CASE(${shape.warningCondition}, 1, 0))` : undefined,
    shape.hasDuration ? `p95 = PERCENTILE(${field('event.duration')}, 95)` : undefined,
  ].filter(Boolean);
  const keep = [
    'bucket',
    'service',
    'total',
    shape.errorCondition ? 'errors' : undefined,
    shape.warningCondition ? 'warnings' : undefined,
  ]
    .concat(shape.hasDuration ? ['p95_ms'] : [])
    .filter(Boolean);
  return `| STATS ${stats.join(', ')} BY service = ${field(
    'service.name'
  )}, bucket = BUCKET(@timestamp, 1 minute)${
    shape.hasDuration ? `\n| EVAL p95_ms = p95 / ${NANOS_PER_MS}` : ''
  }\n| KEEP ${keep.join(', ')}`;
}

function toStats(row: Record<string, unknown>): BucketStats {
  return {
    total: toNumber(row.total),
    errors: toOptionalNumber(row.errors),
    warnings: toOptionalNumber(row.warnings),
    p95Ms: toOptionalNumber(row.p95_ms),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Turns per-minute counts into observations. Silence and latency compare with the previous
 * hour, so the histories are passed in and extended bucket by bucket: a later bucket sees the
 * earlier buckets of the same evaluation.
 */
function deriveObservations({
  source,
  shape,
  buckets,
  services,
  statsOf,
  trafficHistory,
  latencyHistory,
}: {
  source: NightshiftSource;
  shape: SourceShape;
  buckets: number[];
  services: string[];
  statsOf: (service: string, bucketStart: number) => BucketStats | undefined;
  trafficHistory: Map<string, number[]>;
  latencyHistory: Map<string, number[]>;
}): StrategyObservation[] {
  const view = source.view_name;
  return buckets.flatMap((bucketStart) =>
    services.flatMap((service): StrategyObservation[] => {
      const bucketEnd = bucketStart + BUCKET_MS;
      const current = statsOf(service, bucketStart) ?? { total: 0 };
      const serviceWhere = `${field('service.name')} == ${esqlString(service)}`;
      const traffic = trafficHistory.get(service) ?? [];
      const latency = latencyHistory.get(service) ?? [];
      const results: StrategyObservation[] = [
        {
          fingerprint: trafficFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: current.total,
          unit: 'docs',
          looks_off: false,
          internal: true,
          title: `${service} traffic`,
          description: `${current.total} documents in the bucket.`,
          importance: 0,
          evidence_esql: '',
          source_id: source.id,
        },
      ];

      const expected = mean(traffic.slice(-REFERENCE_SAMPLES));
      if (traffic.length > 0 && expected >= SILENCE_MIN_EXPECTED_DOCS) {
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
| WHERE ${timeRangeWhere(bucketStart - 30 * MINUTE_MS, bucketEnd)} AND ${serviceWhere}
| STATS docs = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)
| SORT bucket DESC
| LIMIT 30`,
          source_id: source.id,
        });
      }

      if (shape.errorCondition && current.errors !== undefined && current.total > 0) {
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
| WHERE ${timeRangeWhere(bucketStart, bucketEnd)} AND ${serviceWhere} AND (${shape.errorCondition})
| SORT @timestamp DESC
| LIMIT 20`,
          source_id: source.id,
        });
      }

      if (shape.warningCondition && current.warnings !== undefined && current.total > 0) {
        const ratio = current.warnings / current.total;
        results.push({
          fingerprint: `health:warning_ratio:${source.id}:${service}`,
          service,
          bucket_start: bucketStart,
          value: ratio,
          unit: 'ratio',
          looks_off: ratio >= WARNING_RATIO_TRIGGER && current.warnings >= MIN_WARNINGS,
          title: `${service} warning ratio is ${Math.round(ratio * 100)}%`,
          description: `${current.warnings} of ${current.total} documents are warnings.`,
          importance: Math.min(80, Math.round(40 + ratio * 60)),
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart, bucketEnd)} AND ${serviceWhere} AND (${
            shape.warningCondition
          })
| SORT @timestamp DESC
| LIMIT 20`,
          source_id: source.id,
        });
      }

      if (current.p95Ms !== undefined) {
        const reference = median(latency.slice(-REFERENCE_SAMPLES));
        results.push({
          fingerprint: latencyFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: current.p95Ms,
          unit: 'ms',
          looks_off: reference > 0 && current.p95Ms >= reference * LATENCY_TRIGGER_FACTOR,
          title: `${service} p95 latency is ${Math.round(current.p95Ms)} ms`,
          description: `p95 latency ${Math.round(
            current.p95Ms
          )} ms; the previous hour's median p95 was ${Math.round(reference)} ms.`,
          importance: 60,
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 15 * MINUTE_MS, bucketEnd)} AND ${serviceWhere}
| STATS p95_ms = PERCENTILE(${field(
            'event.duration'
          )}, 95) / ${NANOS_PER_MS} BY bucket = BUCKET(@timestamp, 1 minute)
| SORT bucket DESC
| LIMIT 15`,
          source_id: source.id,
        });
        latencyHistory.set(service, [...latency, current.p95Ms]);
      }

      trafficHistory.set(service, [...traffic, current.total]);
      return results;
    })
  );
}

const logsSourcesOf = (sources: NightshiftSource[]) =>
  sources.filter((source) => source.type === 'logs' || source.type === 'unknown');

/**
 * Counts of the minutes the health rule wrote nothing for, read straight from the source. A
 * minute with no row for any service means the rule did not run, not that every service went
 * quiet; the direct count tells the two apart.
 */
async function healUncoveredBuckets({
  context,
  source,
  shape,
  uncovered,
}: {
  context: StrategyContext;
  source: NightshiftSource;
  shape: SourceShape;
  uncovered: number[];
}): Promise<Map<string, EsqlRow>> {
  const from = Math.min(...uncovered);
  const to = Math.max(...uncovered) + BUCKET_MS;
  const wanted = new Set(uncovered);
  const { rows } = await queryRows({
    esClient: context.dataEsClient,
    query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(from, to)} AND ${field('service.name')} IS NOT NULL
${statsPipeline(shape)}
| LIMIT ${REPLAY_ROW_LIMIT}`,
    signal: context.signal,
  });
  return new Map(
    rows
      .filter((row) => wanted.has(toEpoch(row.bucket)))
      .map((row) => [`${String(row.service)}|${toEpoch(row.bucket)}`, row])
  );
}

async function evaluateLive(context: StrategyContext): Promise<StrategyEvaluation> {
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]));
  const rules = context.ownedRules.filter((rule) => sourcesById.has(rule.source_id));
  if (rules.length === 0) {
    return { observations: [], notes: [], watchedRules: 0 };
  }
  const { rows, truncated } = await context.ruleEvents.read({
    ruleIds: rules.map((rule) => rule.rule_id),
    since: context.from,
    maxRows: context.maxRows,
    signal: context.signal,
  });
  const buckets = bucketStarts(context.from, context.to, BUCKET_MS);
  const notes: string[] = [];

  const perSource = await Promise.all(
    rules.map(async (rule) => {
      const source = sourcesById.get(rule.source_id)!;
      const latest = latestRowPerKey(
        rows.filter((row) => row.rule_id === rule.rule_id),
        (row) => {
          const bucket = toEpoch(row.data.bucket);
          return bucket >= context.from && bucket < context.to && row.data.service !== undefined
            ? `${String(row.data.service)}|${bucket}`
            : undefined;
        }
      );
      const known = await context.records.recentSeries({
        strategy: 'health_checks',
        fingerprintPrefix: `health:traffic:${source.id}:`,
        since: new Date(context.from - REFERENCE_WINDOW_MS).toISOString(),
      });
      const services = [
        ...new Set([
          ...[...latest.values()].map((row) => String(row.data.service)),
          ...known.map((series) => series.service),
        ]),
      ];
      if (services.length === 0) {
        return [];
      }
      const shape: SourceShape = {
        // The evidence query must use the condition the rule counted errors with.
        errorCondition: rule.meta?.error_condition,
        warningCondition: rule.meta?.warning_condition,
        hasDuration: rule.meta?.has_duration === 'true',
      };
      const covered = new Set([...latest.values()].map((row) => toEpoch(row.data.bucket)));
      const uncovered = buckets.filter((bucketStart) => !covered.has(bucketStart));
      const healed =
        uncovered.length > 0
          ? await healUncoveredBuckets({ context, source, shape, uncovered })
          : new Map<string, EsqlRow>();
      if (uncovered.length > 0) {
        notes.push(
          `${source.title}: the health rule wrote nothing for ${uncovered.length} minute(s); they were counted directly from the source.`
        );
      }
      [...healed.values()].forEach((row) => services.push(String(row.service)));

      const history = await context.records.readHistory({
        series: services.flatMap((service) => [
          { fingerprint: trafficFingerprint(source.id, service), exclude: [] },
          { fingerprint: latencyFingerprint(source.id, service), exclude: [] },
        ]),
        before: context.from,
        lookbackMs: REFERENCE_WINDOW_MS,
        limit: REFERENCE_SAMPLES,
      });
      const valuesOf = (fingerprint: string) =>
        (history.get(fingerprint) ?? []).map((sample) => sample.value);
      return deriveObservations({
        source,
        shape,
        buckets,
        services: [...new Set(services)],
        statsOf: (service, bucketStart) => {
          const key = `${service}|${bucketStart}`;
          const row = latest.get(key)?.data ?? healed.get(key);
          return row ? toStats(row) : undefined;
        },
        trafficHistory: new Map(
          services.map((service) => [service, valuesOf(trafficFingerprint(source.id, service))])
        ),
        latencyHistory: new Map(
          services.map((service) => [service, valuesOf(latencyFingerprint(source.id, service))])
        ),
      });
    })
  );

  return { observations: perSource.flat(), notes, truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const results = await Promise.all(
    logsSourcesOf(context.sources).map(async (source): Promise<StrategyEvaluation> => {
      try {
        const shape = await readShape(context.dataEsClient, source, context.signal);
        if (!shape) {
          return { observations: [], notes: [`${source.title}: no service.name field, skipped`] };
        }
        const lookbackFrom = context.from - REFERENCE_WINDOW_MS;
        const { rows } = await queryRows({
          esClient: context.dataEsClient,
          query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(lookbackFrom, context.to)} AND ${field('service.name')} IS NOT NULL
${statsPipeline(shape)}
| LIMIT ${REPLAY_ROW_LIMIT}`,
          signal: context.signal,
          timeoutMs: 120_000,
        });
        const byKey = new Map<string, EsqlRow>(
          rows.map((row) => [`${String(row.service)}|${toEpoch(row.bucket)}`, row])
        );
        const services = [...new Set(rows.map((row) => String(row.service)))];
        const statsOf = (service: string, bucketStart: number) => {
          const row = byKey.get(`${service}|${bucketStart}`);
          return row ? toStats(row) : undefined;
        };
        const reference = bucketStarts(lookbackFrom, context.from, BUCKET_MS);
        const historyOf = (pick: (stats: BucketStats) => number | undefined) =>
          new Map(
            services.map((service) => [
              service,
              reference.flatMap((bucketStart) => {
                const value = pick(statsOf(service, bucketStart) ?? { total: 0 });
                return value === undefined ? [] : [value];
              }),
            ])
          );
        return {
          observations: deriveObservations({
            source,
            shape,
            buckets: bucketStarts(context.from, context.to, BUCKET_MS),
            services,
            statsOf,
            trafficHistory: historyOf((stats) => stats.total),
            latencyHistory: historyOf((stats) => stats.p95Ms),
          }),
          notes: [],
        };
      } catch (error) {
        return { observations: [], notes: [`${source.title}: ${getErrorMessage(error)}`] };
      }
    })
  );
  return {
    observations: results.flatMap((result) => result.observations),
    notes: results.flatMap((result) => result.notes),
  };
}

/**
 * Health checks: per-service checks written in code, with no AI. Error ratio, warning ratio,
 * latency and silence. An Alerting v2 rule per logs source counts documents, errors and p95 latency per
 * service and minute; the engine turns those counts into checks. Silence lives here because the
 * baseline check only finds "more than normal", so a drop in traffic becomes a value that grows
 * when things get worse.
 */
export const healthChecksStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'health_checks',
    name: STRATEGY_NAME,
    watches:
      'Every service in each logs source: error ratio, warning ratio, p95 latency and traffic',
    reportsWhen:
      'Error ratio at or above 5% with 5+ errors, warning ratio at or above 10% with 10+ warnings, p95 latency at twice the previous hour, or traffic dropping 90% or more',
    baselinePolicy: 'own_history',
    runner: 'alerting_v2_rule',
    reportsOnlyFiring: false,
    supportsReplay: true,
    // One rule run per minute, plus room for a late one.
    settleMs: 150_000,
    // Each run re-emits its last three closed minutes: four minutes covers a late run.
    liveWindowMs: 270_000,
    // Every service with traffic gives a row each run, so a fresh row proves the rule ran.
    writesEveryRun: true,
  },

  evaluate: evaluateLive,

  replay: evaluateReplay,

  async desiredRules(context): Promise<DesiredRules> {
    const results = await Promise.all(
      logsSourcesOf(context.sources).map(async (source) => {
        try {
          const shape = await readShape(context.dataEsClient, source, context.signal);
          if (!shape) {
            return { skipped: { source_id: source.id, reason: 'no service.name field' } };
          }
          const built = buildSignalRule({
            spaceId: context.spaceId,
            strategy: 'health_checks',
            strategyName: STRATEGY_NAME,
            source,
            query: `FROM ${source.view_name}
| WHERE ${field('service.name')} IS NOT NULL
${statsPipeline(shape)}
| WHERE bucket < DATE_TRUNC(1 minute, NOW()) AND bucket >= DATE_TRUNC(1 minute, NOW()) - ${RULE_CLOSED_BUCKETS} minutes`,
            every: RULE_EVERY,
            lookback: RULE_LOOKBACK,
            groupBy: ['service', 'bucket'],
            cpsEnabled: context.cpsEnabled,
          });
          return {
            rule: {
              ...built,
              meta: {
                ...(shape.errorCondition ? { error_condition: shape.errorCondition } : {}),
                ...(shape.warningCondition ? { warning_condition: shape.warningCondition } : {}),
                has_duration: String(shape.hasDuration),
              },
            },
          };
        } catch (error) {
          return { skipped: { source_id: source.id, reason: getErrorMessage(error) } };
        }
      })
    );
    return {
      rules: results.flatMap((result) => ('rule' in result && result.rule ? [result.rule] : [])),
      skipped: results.flatMap((result) =>
        'skipped' in result && result.skipped ? [result.skipped] : []
      ),
    };
  },
};
