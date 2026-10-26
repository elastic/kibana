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
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
  toOptionalNumber,
  type EsqlRow,
} from '../esql';
import { binomialUpperTail, poissonCdf } from '../pipeline/count_tests';
import { buildSignalRule } from './rule_definitions';
import { bindSourceFields, failureCondition, preludeOf } from './source_fields';
import { latestRowPerKey } from './rule_events_reader';
import type {
  DesiredRules,
  ISignalStrategy,
  ReplayContext,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'Health checks';
/** How far back the checks look for "what this service usually does". */
const REFERENCE_WINDOW_MS = HOUR_MS;
const REFERENCE_SAMPLES = REFERENCE_WINDOW_MS / BUCKET_MS;
/** Below this, a few chance errors in a quiet bucket would look like a spike. */
const MIN_ERRORS = 5;
/**
 * The error ratio must be at least this far above its normal: two percentage points, the
 * smallest change the RFC called worth an event.
 */
const MIN_ERROR_EFFECT = 0.02;
/**
 * How unlikely this many failures must be at the service's normal rate, as a binomial tail.
 * At 1,440 tests a day per service, about one chance trigger a week before persistence.
 */
const ERROR_P_VALUE = 1e-4;
/** A service with no errors in its history still has some chance of one. */
const NORMAL_ERROR_FLOOR = 0.001;
/**
 * Failures are also judged over the last five minutes, evaluated every minute. A service with
 * eight requests a minute failing 30% fails two or three a minute, under any per-minute floor;
 * over five minutes it is a dozen. The SRE Workbook's short window is five minutes.
 */
const POOL_MINUTES = 5;
/**
 * Warnings are noisier than errors, so the trigger is higher; the baseline check then compares
 * with the service's own warning ratio, so a service that always warns stays quiet.
 */
const WARNING_RATIO_TRIGGER = 0.1;
const MIN_WARNINGS = 10;
const LATENCY_TRIGGER_FACTOR = 2;
/**
 * Fewer durations than this and a minute's p95 says little: a distribution-free interval for a
 * p95 needs 59 samples, and heavy-tailed latency at 20 a minute crosses 2x its own median many
 * times a day.
 */
const MIN_P95_SAMPLES = 100;
/**
 * A median needs far fewer: a distribution-free interval for it exists from 6 samples. Between
 * this and the p95 minimum a service's latency is judged on its median, so a slow dependency of
 * a quiet service is still seen; below it the minute is left unjudged.
 */
const MIN_P50_SAMPLES = 20;
const SILENCE_MIN_EXPECTED_DOCS = 5;
/**
 * Silence is judged only for a service with half an hour of history that sent data in nearly
 * every minute of it. A service that logs a few lines every few minutes, or one seen for two
 * minutes, has no normal to fall silent from: at 95% presence one empty minute is still
 * chance, which is why the RFC asked for presence before absence.
 */
const SILENCE_MIN_HISTORY = 30;
const SILENCE_MIN_PRESENCE = 0.9;
const SILENCE_TRIGGER_DROP = 0.9;
/**
 * How unlikely the quiet minutes must be under the expected traffic, as a Poisson tail. About
 * one chance trigger in 7 days per steady service.
 */
const SILENCE_P_VALUE = 1e-4;
/**
 * Silence is tested over the last one, two and three minutes. A busy service is judged on one
 * empty minute; a quiet one needs more of them before the absence means anything.
 */
const SILENCE_MAX_WINDOW = 3;
/**
 * A source with at least this many services that usually send data, and at least this share of
 * them silent in the same minute, has lost its telemetry rather than its services: one event for
 * the source, not one per service. kube-prometheus pages at 10% of targets down; half is the
 * point where a per-service story stops being likely.
 */
const MIN_SOURCE_SERVICES = 3;
const SOURCE_SILENCE_SHARE = 0.5;
/** The rule runs every minute and re-emits its last three closed buckets, to ride out a late run. */
const RULE_EVERY = '1m';
const RULE_LOOKBACK = '4m';
const RULE_CLOSED_BUCKETS = 3;
/** Rows one replay query may return; one row per service and minute. */
const REPLAY_ROW_LIMIT = 10_000;

/**
 * The fields a source offers that the checks can use. `prelude` binds them: a request status
 * and a duration in milliseconds, read from ECS fields or parsed out of the message, so the same
 * pipeline works on ECS, JSON, logfmt and plain logs.
 */
interface SourceShape {
  prelude: string;
  errorCondition?: string;
  warningCondition?: string;
  /** True when `_duration_ms` holds a request duration in milliseconds. */
  hasDuration: boolean;
  /**
   * Documents that are requests: they carry a status or a duration, or they report a failure.
   * Undefined when the source has neither, and every document then counts.
   */
  requestCondition?: string;
}

/** Counts of one service in one bucket. */
interface BucketStats {
  total: number;
  errors?: number;
  requests?: number;
  warnings?: number;
  p95Ms?: number;
  p50Ms?: number;
  /** How many documents carried a duration, the sample the percentiles came from. */
  durations?: number;
}

/**
 * One past bucket of a reference series, and whether it was part of a problem itself. A
 * reference describes normal, so an outage must not drag its own reference down.
 */
interface ReferenceSample {
  value: number;
  breaching: boolean;
}

/** The references one service is judged against, extended bucket by bucket. */
interface ServiceHistory {
  traffic: ReferenceSample[];
  errorRatio: ReferenceSample[];
  p95: ReferenceSample[];
  p50: ReferenceSample[];
}

const EMPTY_HISTORY: ServiceHistory = { traffic: [], errorRatio: [], p95: [], p50: [] };

const normalValues = (samples: ReferenceSample[]) =>
  samples
    .filter((sample) => !sample.breaching)
    .map((sample) => sample.value)
    .slice(-REFERENCE_SAMPLES);

export const trafficFingerprint = (sourceId: string, service: string) =>
  `health:traffic:${sourceId}:${service}`;
const latencyFingerprint = (sourceId: string, service: string) =>
  `health:latency_p95:${sourceId}:${service}`;
const medianLatencyFingerprint = (sourceId: string, service: string) =>
  `health:latency_p50:${sourceId}:${service}`;
const silenceFingerprint = (sourceId: string, service: string) =>
  `health:silence:${sourceId}:${service}`;
const errorRatioFingerprint = (sourceId: string, service: string) =>
  `health:error_ratio:${sourceId}:${service}`;
const sourceSilenceFingerprint = (sourceId: string) => `health:source_silence:${sourceId}`;

/**
 * The shortest window, of up to three minutes ending at the current one, in which every minute
 * dropped by the trigger and the total is below what a Poisson tail allows for the expected
 * traffic. Undefined while the quiet can still be chance.
 */
function silentWindow({
  totals,
  expected,
}: {
  /** Documents per minute, oldest first, ending with the current minute. */
  totals: number[];
  expected: number;
}): { minutes: number; pValue: number } | undefined {
  return Array.from({ length: Math.min(SILENCE_MAX_WINDOW, totals.length) }, (_, index) => {
    const window = totals.slice(-(index + 1));
    return {
      minutes: index + 1,
      quiet: window.every((total) => total <= (1 - SILENCE_TRIGGER_DROP) * expected),
      pValue: poissonCdf({
        count: window.reduce((sum, total) => sum + total, 0),
        mean: expected * window.length,
      }),
    };
  })
    .filter((window) => window.quiet && window.pValue <= SILENCE_P_VALUE)
    .map(({ minutes, pValue }) => ({ minutes, pValue }))[0];
}

/**
 * Binds the source's level, status and duration, from fields or parsed from messages;
 * undefined when it has no service to group by.
 */
async function readShape(
  esClient: ElasticsearchClient,
  source: NightshiftSource,
  signal: AbortSignal
): Promise<SourceShape | undefined> {
  const fields = await bindSourceFields({ esClient, source, signal });
  if (!fields.columns.includes('service.name')) {
    return undefined;
  }
  const errorCondition = failureCondition(fields);
  const requestCondition =
    fields.hasStatus || fields.hasDuration
      ? [
          fields.hasStatus ? '_status IS NOT NULL' : undefined,
          fields.hasDuration ? '_duration_ms IS NOT NULL' : undefined,
          errorCondition ? `(${errorCondition})` : undefined,
        ]
          .filter(Boolean)
          .join(' OR ')
      : undefined;
  return {
    prelude: preludeOf(fields, ['level', 'duration', 'status']),
    errorCondition,
    warningCondition: fields.levelExpr ? `${fields.levelExpr} IN ("warn", "warning")` : undefined,
    hasDuration: fields.hasDuration,
    requestCondition,
  };
}

/** The aggregation both the rule and replay run, one row per service and minute. */
function statsPipeline(shape: SourceShape): string {
  const stats = [
    'total = COUNT(*)',
    shape.errorCondition ? `errors = SUM(CASE(${shape.errorCondition}, 1, 0))` : undefined,
    shape.requestCondition ? `requests = SUM(CASE(${shape.requestCondition}, 1, 0))` : undefined,
    shape.warningCondition ? `warnings = SUM(CASE(${shape.warningCondition}, 1, 0))` : undefined,
    shape.hasDuration ? 'p95_ms = PERCENTILE(_duration_ms, 95)' : undefined,
    shape.hasDuration ? 'p50_ms = MEDIAN(_duration_ms)' : undefined,
    shape.hasDuration ? 'durations = COUNT(_duration_ms)' : undefined,
  ].filter(Boolean);
  const keep = [
    'bucket',
    'service',
    'total',
    shape.errorCondition ? 'errors' : undefined,
    shape.requestCondition ? 'requests' : undefined,
    shape.warningCondition ? 'warnings' : undefined,
  ]
    .concat(shape.hasDuration ? ['p95_ms', 'p50_ms', 'durations'] : [])
    .filter(Boolean);
  return `${shape.prelude ? `${shape.prelude}\n` : ''}| STATS ${stats.join(
    ', '
  )} BY service = ${field('service.name')}, bucket = BUCKET(@timestamp, 1 minute)
| KEEP ${keep.join(', ')}`;
}

function toStats(row: Record<string, unknown>): BucketStats {
  return {
    total: toNumber(row.total),
    errors: toOptionalNumber(row.errors),
    requests: toOptionalNumber(row.requests),
    warnings: toOptionalNumber(row.warnings),
    p95Ms: toOptionalNumber(row.p95_ms),
    p50Ms: toOptionalNumber(row.p50_ms),
    durations: toOptionalNumber(row.durations),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

const percent = (ratio: number) =>
  ratio >= 0.1 ? `${Math.round(ratio * 100)}%` : `${(ratio * 100).toFixed(1)}%`;

/**
 * Turns per-minute counts into observations. Every check compares with the service's previous
 * hour, so the histories are passed in and extended bucket by bucket: a later bucket sees the
 * earlier buckets of the same evaluation.
 */
function deriveObservations({
  source,
  shape,
  buckets,
  services,
  statsOf,
  histories,
}: {
  source: NightshiftSource;
  shape: SourceShape;
  buckets: number[];
  services: string[];
  statsOf: (service: string, bucketStart: number) => BucketStats | undefined;
  histories: Map<string, ServiceHistory>;
}): StrategyObservation[] {
  const view = source.view_name;
  return buckets.flatMap((bucketStart) => {
    const perService = services.flatMap((service): StrategyObservation[] => {
      const bucketEnd = bucketStart + BUCKET_MS;
      const current = statsOf(service, bucketStart) ?? { total: 0 };
      const serviceWhere = `${field('service.name')} == ${esqlString(service)}`;
      const history = histories.get(service) ?? EMPTY_HISTORY;
      const next: ServiceHistory = { ...history };
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

      const normalTraffic = normalValues(history.traffic);
      const expected = mean(normalTraffic);
      const presence =
        normalTraffic.length > 0
          ? normalTraffic.filter((total) => total > 0).length / normalTraffic.length
          : 0;
      const hasExpected =
        normalTraffic.length >= SILENCE_MIN_HISTORY &&
        presence >= SILENCE_MIN_PRESENCE &&
        expected >= SILENCE_MIN_EXPECTED_DOCS;
      const drop = hasExpected ? Math.max(0, 1 - current.total / expected) : 0;
      if (hasExpected) {
        const silent = silentWindow({
          totals: [
            ...history.traffic.slice(-(SILENCE_MAX_WINDOW - 1)).map((sample) => sample.value),
            current.total,
          ],
          expected,
        });
        results.push({
          fingerprint: silenceFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: drop,
          unit: 'drop',
          looks_off: silent !== undefined,
          // Its own window already asks for persistence where the traffic is too low for one
          // empty minute to mean anything.
          confirmed: true,
          title: `${service} went quiet`,
          description: `${current.total} documents in the bucket; about ${Math.round(
            expected
          )} expected from the previous hour's normal minutes.${
            silent
              ? ` The last ${
                  silent.minutes
                } minute(s) together are below what that traffic allows by chance (Poisson p = ${silent.pValue.toPrecision(
                  2
                )}).`
              : ''
          }`,
          importance: 70,
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 30 * MINUTE_MS, bucketEnd)} AND ${serviceWhere}
| STATS docs = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)
| SORT bucket DESC
| LIMIT 30`,
          source_id: source.id,
        });
      }
      // A near-silent minute never becomes normal, even before the Poisson test trusts it.
      next.traffic = [
        ...history.traffic,
        { value: current.total, breaching: drop >= SILENCE_TRIGGER_DROP },
      ];

      const scoped = shape.requestCondition !== undefined && (current.requests ?? 0) > 0;
      const population = scoped ? current.requests! : current.total;
      if (shape.errorCondition && current.errors !== undefined && population > 0) {
        const errors = current.errors;
        const ratio = errors / population;
        const normal = median(normalValues(history.errorRatio));
        const pValue = binomialUpperTail({
          count: errors,
          trials: population,
          probability: Math.max(normal, NORMAL_ERROR_FLOOR),
        });
        const minuteOff =
          errors >= MIN_ERRORS && ratio >= normal + MIN_ERROR_EFFECT && pValue <= ERROR_P_VALUE;
        const earlier = Array.from({ length: POOL_MINUTES - 1 }, (_, index) =>
          statsOf(service, bucketStart - (index + 1) * BUCKET_MS)
        ).filter((stats): stats is BucketStats => stats !== undefined);
        const pooledErrors = errors + earlier.reduce((sum, stats) => sum + (stats.errors ?? 0), 0);
        const pooledPopulation =
          population +
          earlier.reduce(
            (sum, stats) =>
              sum +
              (shape.requestCondition && (stats.requests ?? 0) > 0 ? stats.requests! : stats.total),
            0
          );
        const pooledRatio = pooledPopulation > 0 ? pooledErrors / pooledPopulation : 0;
        const pooledP = binomialUpperTail({
          count: pooledErrors,
          trials: pooledPopulation,
          probability: Math.max(normal, NORMAL_ERROR_FLOOR),
        });
        // Only while the service still fails in this minute, so recovery is not held back.
        const pooledOff =
          errors > 0 &&
          pooledErrors >= MIN_ERRORS &&
          pooledRatio >= normal + MIN_ERROR_EFFECT &&
          pooledP <= ERROR_P_VALUE;
        const looksOff = minuteOff || pooledOff;
        results.push({
          fingerprint: errorRatioFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: ratio,
          unit: 'ratio',
          looks_off: looksOff,
          title: scoped
            ? `${service} is failing ${percent(ratio)} of requests`
            : `${service} error-log share is ${percent(ratio)}`,
          description: `${errors} of ${population} ${
            scoped ? 'requests failed' : 'documents are errors'
          }; normal is about ${percent(normal)}${
            minuteOff
              ? `, and this many at that rate has a chance of ${pValue.toPrecision(2)}`
              : pooledOff
              ? `. Over the last ${POOL_MINUTES} minutes ${pooledErrors} of ${pooledPopulation} failed (${percent(
                  pooledRatio
                )}), which at that rate has a chance of ${pooledP.toPrecision(2)}`
              : ''
          }.${
            scoped
              ? ''
              : ' The source has no request status or duration, so this counts log lines, not requests.'
          }`,
          // A share of log lines moves with verbosity as well as with failures, so it weighs less.
          importance: scoped
            ? Math.min(95, Math.round(50 + ratio * 100))
            : Math.min(80, Math.round(40 + ratio * 80)),
          evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart, bucketEnd)} AND ${serviceWhere}
${shape.prelude ? `${shape.prelude}\n` : ''}| WHERE ${shape.errorCondition}
| SORT @timestamp DESC
| LIMIT 20`,
          source_id: source.id,
        });
        next.errorRatio = [...history.errorRatio, { value: ratio, breaching: looksOff }];
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
          // A warning is a cause, not a symptom: it explains an event, it never opens one.
          supporting: true,
          title: `${service} warning ratio is ${percent(ratio)}`,
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

      const durations = current.durations ?? 0;
      const latencyEvidence = `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 15 * MINUTE_MS, bucketEnd)} AND ${serviceWhere}
${
  shape.prelude ? `${shape.prelude}\n` : ''
}| STATS p95_ms = PERCENTILE(_duration_ms, 95), p50_ms = MEDIAN(_duration_ms), durations = COUNT(_duration_ms) BY bucket = BUCKET(@timestamp, 1 minute)
| SORT bucket DESC
| LIMIT 15`;
      const p95Ms = current.p95Ms;
      const p50Ms = current.p50Ms;
      if (p95Ms !== undefined && durations >= MIN_P95_SAMPLES) {
        const reference = median(normalValues(history.p95));
        const latencyLooksOff = reference > 0 && p95Ms >= reference * LATENCY_TRIGGER_FACTOR;
        results.push({
          fingerprint: latencyFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: p95Ms,
          unit: 'ms',
          looks_off: latencyLooksOff,
          title: `${service} p95 latency is ${Math.round(p95Ms)} ms`,
          description: `p95 latency ${Math.round(
            p95Ms
          )} ms over ${durations} durations; the previous hour's median p95 was ${Math.round(
            reference
          )} ms.`,
          importance: 60,
          evidence_esql: latencyEvidence,
          source_id: source.id,
        });
        next.p95 = [...history.p95, { value: p95Ms, breaching: latencyLooksOff }];
      } else if (p50Ms !== undefined && durations >= MIN_P50_SAMPLES) {
        const reference = median(normalValues(history.p50));
        const latencyLooksOff = reference > 0 && p50Ms >= reference * LATENCY_TRIGGER_FACTOR;
        results.push({
          fingerprint: medianLatencyFingerprint(source.id, service),
          service,
          bucket_start: bucketStart,
          value: p50Ms,
          unit: 'ms',
          looks_off: latencyLooksOff,
          title: `${service} median latency is ${Math.round(p50Ms)} ms`,
          description: `Median latency ${Math.round(
            p50Ms
          )} ms over ${durations} durations, too few for a p95; the previous hour's median was ${Math.round(
            reference
          )} ms.`,
          importance: 60,
          evidence_esql: latencyEvidence,
          source_id: source.id,
        });
        next.p50 = [...history.p50, { value: p50Ms, breaching: latencyLooksOff }];
      }

      histories.set(service, next);
      return results;
    });
    return withSourceSilence({ source, bucketStart, perService });
  });
}

/**
 * One observation for the whole source when most of its services went silent in the same
 * minute. Collection failure, an ingest delay and a fleet-wide outage all look like this, and the
 * data alone cannot tell them apart, so it is one event; each service's own silence then only
 * supports it.
 */
function withSourceSilence({
  source,
  bucketStart,
  perService,
}: {
  source: NightshiftSource;
  bucketStart: number;
  perService: StrategyObservation[];
}): StrategyObservation[] {
  const isSilence = (observation: StrategyObservation) =>
    observation.fingerprint.startsWith('health:silence:');
  const silences = perService.filter(isSilence);
  if (silences.length < MIN_SOURCE_SERVICES) {
    return perService;
  }
  const silent = silences.filter((observation) => observation.looks_off);
  const share = silent.length / silences.length;
  const widespread = share >= SOURCE_SILENCE_SHARE;
  return [
    ...perService.map((observation) =>
      widespread && isSilence(observation) && observation.looks_off
        ? { ...observation, supporting: true }
        : observation
    ),
    {
      fingerprint: sourceSilenceFingerprint(source.id),
      service: source.title,
      bucket_start: bucketStart,
      value: share,
      unit: 'drop',
      looks_off: widespread,
      confirmed: true,
      title: `${source.title}: ${silent.length} of ${silences.length} services went quiet`,
      description: `${silent.length} of the ${
        silences.length
      } services that usually send data to this source sent almost nothing in the same minute (${silent
        .map((observation) => observation.service)
        .slice(0, 8)
        .join(', ')}${
        silent.length > 8 ? ', ...' : ''
      }). A stopped collector, an ingest delay and a fleet-wide outage all look like this.`,
      importance: 85,
      evidence_esql: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(bucketStart - 30 * MINUTE_MS, bucketStart + BUCKET_MS)}
| STATS docs = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)
| SORT bucket DESC
| LIMIT 30`,
      source_id: source.id,
    },
  ];
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

/** The shape a rule was built with, so evidence and healing use the same conditions. */
function shapeOfRule(meta: Record<string, string> | undefined): SourceShape {
  return {
    prelude: meta?.prelude ?? '',
    errorCondition: meta?.error_condition,
    warningCondition: meta?.warning_condition,
    hasDuration: meta?.has_duration === 'true',
    requestCondition: meta?.request_condition,
  };
}

async function evaluateLive(context: StrategyContext): Promise<StrategyEvaluation> {
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]));
  const rules = context.ownedRules.filter((rule) => sourcesById.has(rule.source_id));
  if (rules.length === 0) {
    return { observations: [], notes: [], watchedRules: 0 };
  }
  const pooledFrom = context.from - (POOL_MINUTES - 1) * BUCKET_MS;
  const { rows, truncated } = await context.ruleEvents.read({
    ruleIds: rules.map((rule) => rule.rule_id),
    since: pooledFrom,
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
          return bucket >= pooledFrom && bucket < context.to && row.data.service !== undefined
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
      // The evidence query must use the conditions the rule counted with.
      const shape = shapeOfRule(rule.meta);
      const covered = new Set(
        [...latest.values()]
          .map((row) => toEpoch(row.data.bucket))
          .filter((bucket) => bucket >= context.from)
      );
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
      const allServices = [...new Set(services)];

      const history = await context.records.readHistory({
        series: allServices.flatMap((service) =>
          [
            trafficFingerprint,
            latencyFingerprint,
            medianLatencyFingerprint,
            silenceFingerprint,
            errorRatioFingerprint,
          ].map((fingerprintOf) => ({
            fingerprint: fingerprintOf(source.id, service),
            exclude: [],
          }))
        ),
        before: context.from,
        lookbackMs: REFERENCE_WINDOW_MS,
        limit: REFERENCE_SAMPLES,
      });
      const samplesOf = (fingerprint: string) => history.get(fingerprint) ?? [];
      // A minute the service went near-silent, or a check fired, is part of a problem and stays
      // out of the reference that judges the next minutes.
      const breachingByLooksOff = (fingerprint: string): ReferenceSample[] =>
        samplesOf(fingerprint).map((sample) => ({
          value: sample.value,
          breaching: sample.looks_off === true,
        }));
      const historyOf = (service: string): ServiceHistory => {
        const quiet = new Set(
          samplesOf(silenceFingerprint(source.id, service))
            .filter((sample) => sample.value >= SILENCE_TRIGGER_DROP)
            .map((sample) => Date.parse(sample.bucket_start))
        );
        return {
          traffic: samplesOf(trafficFingerprint(source.id, service)).map((sample) => ({
            value: sample.value,
            breaching: quiet.has(Date.parse(sample.bucket_start)),
          })),
          errorRatio: breachingByLooksOff(errorRatioFingerprint(source.id, service)),
          p95: breachingByLooksOff(latencyFingerprint(source.id, service)),
          p50: breachingByLooksOff(medianLatencyFingerprint(source.id, service)),
        };
      };
      return deriveObservations({
        source,
        shape,
        buckets,
        services: allServices,
        statsOf: (service, bucketStart) => {
          const key = `${service}|${bucketStart}`;
          const row = latest.get(key)?.data ?? healed.get(key);
          return row ? toStats(row) : undefined;
        },
        histories: new Map(allServices.map((service) => [service, historyOf(service)])),
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
        // The hour before a replay was never judged, so nothing in it is known to be breaching;
        // the minutes the replay itself judges are marked as it goes.
        const seriesOf = (service: string, pick: (stats: BucketStats) => number | undefined) =>
          reference.flatMap((bucketStart) => {
            const value = pick(statsOf(service, bucketStart) ?? { total: 0 });
            return value === undefined ? [] : [{ value, breaching: false }];
          });
        const histories = new Map(
          services.map((service): [string, ServiceHistory] => [
            service,
            {
              traffic: seriesOf(service, (stats) => stats.total),
              errorRatio: seriesOf(service, (stats) => {
                const population =
                  shape.requestCondition && (stats.requests ?? 0) > 0
                    ? stats.requests!
                    : stats.total;
                return stats.errors !== undefined && population > 0
                  ? stats.errors / population
                  : undefined;
              }),
              p95: seriesOf(service, (stats) =>
                (stats.durations ?? 0) >= MIN_P95_SAMPLES ? stats.p95Ms : undefined
              ),
              p50: seriesOf(service, (stats) =>
                (stats.durations ?? 0) >= MIN_P50_SAMPLES &&
                (stats.durations ?? 0) < MIN_P95_SAMPLES
                  ? stats.p50Ms
                  : undefined
              ),
            },
          ])
        );
        return {
          observations: deriveObservations({
            source,
            shape,
            buckets: bucketStarts(context.from, context.to, BUCKET_MS),
            services,
            statsOf,
            histories,
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
 * Health checks: per-service checks written in code, with no AI. Request error ratio, latency
 * and silence, plus a warning ratio that only supports other signals and a source-wide silence.
 * An Alerting v2 rule per logs source counts documents, failures, requests and latency per
 * service and minute, reading status and duration from ECS fields or parsing them out of the
 * message; the engine turns those counts into checks against each service's own previous hour.
 * Silence lives here because the baseline check only finds "more than normal", so a drop in
 * traffic becomes a value that grows when things get worse.
 */
export const healthChecksStrategy: ISignalStrategy = {
  descriptor: {
    id: 'health_checks',
    name: STRATEGY_NAME,
    watches:
      'Every service in each logs source: request error ratio, latency, traffic and warnings, with status and duration read from fields or parsed from messages',
    reportsWhen:
      'More failed requests than the service’s own normal rate allows by chance (binomial p <= 1e-4, 5+ failures, 2+ points above normal), latency at twice the previous hour (p95 over 100+ durations, median over 20+), traffic dropping 90% for longer than chance allows, or most of a source going quiet at once; two of three minutes must agree',
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
    confirmation: { need: 2, of: 3 },
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
                prelude: shape.prelude,
                ...(shape.errorCondition ? { error_condition: shape.errorCondition } : {}),
                ...(shape.warningCondition ? { warning_condition: shape.warningCondition } : {}),
                ...(shape.requestCondition ? { request_condition: shape.requestCondition } : {}),
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
