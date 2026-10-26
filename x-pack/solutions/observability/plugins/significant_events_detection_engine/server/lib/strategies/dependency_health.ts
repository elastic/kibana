/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, HOUR_MS } from '../../../common';
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
  type EsqlRow,
} from '../esql';
import { buildSignalRule } from './rule_definitions';
import { latestRowPerKey } from './rule_events_reader';
import { bindSourceFields, failureCondition, preludeOf } from './source_fields';
import type {
  DesiredRules,
  ISignalStrategy,
  ReplayContext,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'Dependency health';
/**
 * Failed calls are counted over the last five minutes, evaluated every minute: a quiet caller
 * fails a dependency two or three times a minute, under any per-minute floor. Fewer than this
 * in five minutes is a retry, not a failing dependency.
 */
const POOL_MINUTES = 5;
const MIN_FAILURES = 5;
/** A dependency that failed within the last hour keeps being reported, at zero once it stops. */
const ACTIVE_WINDOW_MS = HOUR_MS;
const RULE_EVERY = '1m';
const RULE_LOOKBACK = '4m';
const RULE_CLOSED_BUCKETS = 3;
const REPLAY_ROW_LIMIT = 10_000;
/** The services a rule can name; past this the rule would be one CASE too long to read. */
const MAX_DEPENDENCIES = 200;
const SERVICES_WINDOW = '1 hour';
/** Each caller after the first makes it likelier the dependency, not the caller, is at fault. */
const IMPORTANCE_PER_CALLER = 10;
const BASE_IMPORTANCE = 55;
const MAX_IMPORTANCE = 90;

/**
 * Words a failed call leaves in its caller's log line. `returned 5` catches "returned 503" and
 * leaves out business answers such as "returned 402".
 */
const FAILURE_WORDS = [
  'timeout',
  'timed out',
  'deadline exceeded',
  'refused',
  'connection reset',
  'unavailable',
  'unreachable',
  'no such host',
  'broken pipe',
  'returned 5',
];

/** What one source offers this strategy, kept on its rule so evidence reads the same way. */
interface DependencyShape {
  messageField: string;
  /** Binds level and status when they live only in the message. */
  prelude: string;
  failure: string;
  dependencies: string[];
}

export const dependencyFingerprint = (sourceId: string, dependency: string) =>
  `dependency:${sourceId}:${dependency}`;
const watchFingerprint = (sourceId: string) => `dependency_watch:${sourceId}`;

/**
 * Where a service name sits when a line names it as the other end of a call: a URL host
 * (`http://payments:8080/charge`), a quoted value (`"supplier":"supplier-air"`) or a logfmt
 * value (`upstream=search`). A name in free text, such as "search rejected", does not count:
 * a service describing its own work names its routes too.
 */
export function callNamePatterns(dependency: string): string[] {
  const name = dependency.toLowerCase();
  return [`*//${name}:*`, `*//${name}/*`, `*"${name}"*`, `*=${name} *`, `*=${name}`];
}

/** Slices of `callNamePatterns`, strongest first: URL host, quoted value, logfmt value. */
const NAMING_STRENGTHS = [
  { from: 0, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 5 },
] as const;

/** Any of the forms that name a dependency as the other end of a call. */
function namesCondition(message: string, dependency: string): string {
  return callNamePatterns(dependency)
    .map((pattern) => `${message} LIKE ${esqlString(pattern)}`)
    .join(' OR ');
}

/**
 * Failed calls that name another service, counted per dependency, caller and minute. The CASE
 * takes the first service a line names; a line naming its own service is left to that service.
 */
function failurePipeline(shape: DependencyShape): string {
  // Strongest form first, across every service: a line can name its target in a URL and list
  // other services in a hops map, and the URL is the call that failed. In the lab, taking the
  // first service alphabetically blamed availability for payments' failures.
  const branches = NAMING_STRENGTHS.flatMap((strength) =>
    shape.dependencies.map(
      (dependency) =>
        `(${callNamePatterns(dependency)
          .slice(strength.from, strength.to)
          .map((pattern) => `_m LIKE ${esqlString(pattern)}`)
          .join(' OR ')}) AND ${field('service.name')} != ${esqlString(dependency)}, ${esqlString(
          dependency
        )}`
    )
  ).join(',\n    ');
  return `${shape.prelude ? `${shape.prelude}\n` : ''}| EVAL _m = TO_LOWER(${field(
    shape.messageField
  )})
| WHERE ${shape.failure}
| EVAL dependency = CASE(
    ${branches},
    null)
| WHERE dependency IS NOT NULL
| STATS failures = COUNT(*) BY dependency, caller = ${field(
    'service.name'
  )}, bucket = BUCKET(@timestamp, 1 minute)`;
}

/** The failed calls naming one dependency in one minute, for people and for the agent. */
function evidenceQuery({
  source,
  shape,
  dependency,
  bucketStart,
}: {
  source: NightshiftSource;
  shape: DependencyShape;
  dependency: string;
  bucketStart: number;
}): string {
  return `FROM ${source.view_name}
| WHERE ${timeRangeWhere(bucketStart, bucketStart + BUCKET_MS)} AND ${field(
    'service.name'
  )} != ${esqlString(dependency)}
${shape.prelude ? `${shape.prelude}\n` : ''}| EVAL _m = TO_LOWER(${field(shape.messageField)})
| WHERE (${shape.failure}) AND (${namesCondition('_m', dependency)})
| KEEP @timestamp, ${field('service.name')}, ${field(shape.messageField)}
| SORT @timestamp DESC
| LIMIT 20`;
}

/** The services a source has logged recently: the names a caller's failure can point at. */
async function recentServices(
  esClient: ElasticsearchClient,
  source: NightshiftSource,
  signal: AbortSignal,
  range = `@timestamp >= NOW() - ${SERVICES_WINDOW}`
): Promise<string[]> {
  const { rows } = await queryRows({
    esClient,
    query: `FROM ${source.view_name}
| WHERE ${range} AND ${field('service.name')} IS NOT NULL
| STATS BY service = ${field('service.name')}
| LIMIT ${MAX_DEPENDENCIES}`,
    signal,
  });
  // Sorted, so the same services always build the same rule and the same rule id.
  return rows.map((row) => String(row.service)).sort();
}

async function readShape({
  esClient,
  source,
  signal,
  range,
}: {
  esClient: ElasticsearchClient;
  source: NightshiftSource;
  signal: AbortSignal;
  range?: string;
}): Promise<DependencyShape | { reason: string }> {
  const fields = await bindSourceFields({ esClient, source, signal });
  if (!fields.columns.includes('service.name') || !fields.messageField) {
    return { reason: 'no service.name or message field' };
  }
  const dependencies = await recentServices(esClient, source, signal, range);
  if (dependencies.length < 2) {
    return { reason: 'fewer than two services, so nothing calls anything' };
  }
  const words = FAILURE_WORDS.map((word) => `_m LIKE ${esqlString(`*${word}*`)}`).join(' OR ');
  const failure = [failureCondition(fields), words].filter(Boolean).join(' OR ');
  return {
    messageField: fields.messageField,
    prelude: preludeOf(fields, ['level', 'status']),
    failure: `(${failure})`,
    dependencies,
  };
}

const shapeOfMeta = (meta: Record<string, string> | undefined): DependencyShape | undefined =>
  meta?.message_field && meta.failure
    ? {
        messageField: meta.message_field,
        prelude: meta.prelude ?? '',
        failure: meta.failure,
        dependencies: [],
      }
    : undefined;

/** One row of the rule or replay: failed calls of one caller to one dependency in a minute. */
interface FailureRow {
  dependency: string;
  caller: string;
  bucket: number;
  failures: number;
}

const toFailureRow = (data: EsqlRow): FailureRow => ({
  dependency: String(data.dependency),
  caller: String(data.caller),
  bucket: toEpoch(data.bucket),
  failures: toNumber(data.failures),
});

/**
 * Per minute: a heartbeat for the source, then one series per dependency its callers failed
 * on, and zeros for dependencies that failed within the last hour, so an open event can see the
 * failures stop.
 */
function deriveObservations({
  source,
  shape,
  buckets,
  rows,
  active,
  ruleId,
}: {
  source: NightshiftSource;
  shape: DependencyShape;
  buckets: number[];
  rows: FailureRow[];
  active: Array<{ fingerprint: string; service: string }>;
  ruleId?: string;
}): StrategyObservation[] {
  return buckets.flatMap((bucketStart) => {
    const inBucket = rows.filter((row) => row.bucket === bucketStart);
    const inPool = rows.filter(
      (row) => row.bucket <= bucketStart && row.bucket > bucketStart - POOL_MINUTES * BUCKET_MS
    );
    const failingNow = new Set(inBucket.map((row) => row.dependency));
    const byDependency = inPool.reduce((groups, row) => {
      const current = groups.get(row.dependency) ?? { failures: 0, callers: new Map() };
      current.callers.set(row.caller, (current.callers.get(row.caller) ?? 0) + row.failures);
      groups.set(row.dependency, { ...current, failures: current.failures + row.failures });
      return groups;
    }, new Map<string, { failures: number; callers: Map<string, number> }>());
    const quiet = active
      .map((series) => series.service)
      .filter((dependency) => !byDependency.has(dependency));
    const total = inBucket.reduce((sum, row) => sum + row.failures, 0);
    const heartbeat: StrategyObservation = {
      fingerprint: watchFingerprint(source.id),
      service: source.title,
      bucket_start: bucketStart,
      value: total,
      unit: 'count',
      looks_off: false,
      internal: true,
      title: `${source.title} dependency failures counted`,
      description: `${total} failed calls named another service.`,
      importance: 0,
      evidence_esql: '',
      source_id: source.id,
    };
    const series = [
      ...[...byDependency.entries()],
      ...quiet.map((dependency): [string, { failures: number; callers: Map<string, number> }] => [
        dependency,
        { failures: 0, callers: new Map() },
      ]),
    ].map(([dependency, { failures, callers }]): StrategyObservation => {
      const callerList = [...callers.entries()].sort((a, b) => b[1] - a[1]);
      const callerText = callerList.map(([caller, count]) => `${caller} (${count})`).join(', ');
      return {
        fingerprint: dependencyFingerprint(source.id, dependency),
        service: dependency,
        bucket_start: bucketStart,
        value: failures,
        unit: 'count',
        // Only while calls still fail in this minute, so recovery is not held back.
        looks_off: failures >= MIN_FAILURES && failingNow.has(dependency),
        title:
          callerList.length > 1
            ? `${dependency} is failing ${callerList.length} of its callers`
            : callerList.length === 1
            ? `${callerList[0][0]} cannot reach ${dependency}`
            : `${dependency} calls`,
        description:
          failures > 0
            ? `${failures} failed calls named ${dependency} in the last ${POOL_MINUTES} minutes, from ${callerText}. Several callers failing on the same dependency points at the dependency, even when it logs nothing itself.`
            : `No failed calls named ${dependency} in the last ${POOL_MINUTES} minutes.`,
        importance: Math.min(
          MAX_IMPORTANCE,
          BASE_IMPORTANCE + IMPORTANCE_PER_CALLER * Math.max(0, callerList.length - 1)
        ),
        evidence_esql: evidenceQuery({ source, shape, dependency, bucketStart }),
        source_id: source.id,
        rule_id: ruleId,
        heartbeat: watchFingerprint(source.id),
      };
    });
    return [heartbeat, ...series];
  });
}

const logsSourcesOf = (sources: NightshiftSource[]) =>
  sources.filter((source) => source.type === 'logs' || source.type === 'unknown');

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
  const perRule = await Promise.all(
    rules.map(async (rule) => {
      const source = sourcesById.get(rule.source_id)!;
      const shape = shapeOfMeta(rule.meta);
      if (!shape) {
        return [];
      }
      const latest = latestRowPerKey(
        rows.filter((row) => row.rule_id === rule.rule_id),
        (row) => {
          const bucket = toEpoch(row.data.bucket);
          return bucket >= pooledFrom && bucket < context.to && row.data.dependency
            ? `${String(row.data.dependency)}|${String(row.data.caller)}|${bucket}`
            : undefined;
        }
      );
      const active = await context.records.recentSeries({
        strategy: 'dependency_health',
        fingerprintPrefix: `dependency:${source.id}:`,
        since: new Date(context.from - ACTIVE_WINDOW_MS).toISOString(),
        activeOnly: true,
      });
      // A minute with no row had no failed calls: the rule only returns minutes with one.
      return deriveObservations({
        source,
        shape,
        buckets,
        rows: [...latest.values()].map((row) => toFailureRow(row.data)),
        active,
        ruleId: rule.rule_id,
      });
    })
  );
  return { observations: perRule.flat(), notes: [], truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const buckets = bucketStarts(context.from, context.to, BUCKET_MS);
  const results = await Promise.all(
    logsSourcesOf(context.sources).map(async (source): Promise<StrategyEvaluation> => {
      try {
        const range = timeRangeWhere(context.from - ACTIVE_WINDOW_MS, context.to);
        const shape = await readShape({
          esClient: context.dataEsClient,
          source,
          signal: context.signal,
          range,
        });
        if ('reason' in shape) {
          return { observations: [], notes: [`${source.title}: ${shape.reason}, skipped`] };
        }
        const { rows } = await queryRows({
          esClient: context.dataEsClient,
          query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(context.from - (POOL_MINUTES - 1) * BUCKET_MS, context.to)} AND ${field(
            'service.name'
          )} IS NOT NULL AND ${field(shape.messageField)} IS NOT NULL
${failurePipeline(shape)}
| LIMIT ${REPLAY_ROW_LIMIT}`,
          signal: context.signal,
          timeoutMs: 120_000,
        });
        const active = context.records
          ? await context.records.recentSeries({
              strategy: 'dependency_health',
              fingerprintPrefix: `dependency:${source.id}:`,
              since: new Date(context.from - ACTIVE_WINDOW_MS).toISOString(),
              activeOnly: true,
            })
          : [];
        return {
          observations: deriveObservations({
            source,
            shape,
            buckets,
            rows: rows.map(toFailureRow),
            active,
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
 * Dependency health: a dependency as its callers see it. One Alerting v2 rule per logs source
 * counts the failed calls each service logs against another service it names, per minute. The
 * signal is about the dependency, so a database or a third-party API that logs nothing still
 * gets one, and several callers failing on it at once is the strongest sign it is at fault.
 * In the incidents Microsoft Teams' monitors missed, 42% were dependency failures.
 */
export const dependencyHealthStrategy: ISignalStrategy = {
  descriptor: {
    id: 'dependency_health',
    name: STRATEGY_NAME,
    watches:
      'Failed calls each service logs against another service of the same source: timeouts, refused connections, 5xx answers, errors naming it',
    reportsWhen:
      'A dependency gets 5+ failed calls from its callers over the last five minutes, above its own normal, in two of three minutes',
    baselinePolicy: 'own_history',
    runner: 'alerting_v2_rule',
    reportsOnlyFiring: false,
    supportsReplay: true,
    settleMs: 150_000,
    liveWindowMs: 270_000,
    confirmation: { need: 2, of: 3 },
  },

  evaluate: evaluateLive,

  replay: evaluateReplay,

  async desiredRules(context): Promise<DesiredRules> {
    const results = await Promise.all(
      logsSourcesOf(context.sources).map(async (source) => {
        try {
          const shape = await readShape({
            esClient: context.dataEsClient,
            source,
            signal: context.signal,
          });
          if ('reason' in shape) {
            return { skipped: { source_id: source.id, reason: shape.reason } };
          }
          const built = buildSignalRule({
            spaceId: context.spaceId,
            strategy: 'dependency_health',
            strategyName: STRATEGY_NAME,
            source,
            query: `FROM ${source.view_name}
| WHERE ${field('service.name')} IS NOT NULL AND ${field(shape.messageField)} IS NOT NULL
${failurePipeline(shape)}
| WHERE bucket < DATE_TRUNC(1 minute, NOW()) AND bucket >= DATE_TRUNC(1 minute, NOW()) - ${RULE_CLOSED_BUCKETS} minutes`,
            every: RULE_EVERY,
            lookback: RULE_LOOKBACK,
            groupBy: ['dependency', 'caller', 'bucket'],
            cpsEnabled: context.cpsEnabled,
          });
          return {
            rule: {
              ...built,
              meta: {
                message_field: shape.messageField,
                prelude: shape.prelude,
                failure: shape.failure,
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
