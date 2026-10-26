/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  esqlString,
  field,
  queryRows,
  shortHash,
  timeRangeWhere,
  toEpoch,
  toNumber,
  toOptionalNumber,
} from '../esql';
import { binomialUpperTail } from '../pipeline/count_tests';
import { bindSourceFields, failureCondition, preludeOf, type SourceFields } from './source_fields';
import type { ISignalStrategy, StrategyContext, StrategyEvaluation } from './types';

const STRATEGY_NAME = 'Change regressions';
/** How far back the engine looks for the versions or instances a service ran. */
const MARKER_WINDOW_MS = 2 * HOUR_MS;
/**
 * A marker first seen this soon after the window starts may simply have been running already:
 * the window only shows when it was first seen inside it.
 */
const MARKER_EDGE_MS = 10 * MINUTE_MS;
/**
 * How long after a change its regressions are watched. In Azure most catastrophic issues after
 * a rollout showed within an hour; half an hour more covers slow traffic.
 */
const CHANGE_WATCH_MS = 90 * MINUTE_MS;
/** What the service did before the change, compared with what the new version does after. */
const BEFORE_WINDOW_MS = 30 * MINUTE_MS;
/**
 * The new version is judged on its last 15 minutes, not everything since the change: once it
 * stops failing, or is rolled back and stops serving, the signal recovers.
 */
const AFTER_WINDOW_MS = 15 * MINUTE_MS;
/** The new version must fail at least this many times as often as the service did before. */
const FAILURE_FACTOR = 2;
const MIN_FAILURES = 5;
const MIN_FAILURE_EFFECT = 0.02;
const FAILURE_P_VALUE = 1e-4;
const NORMAL_FAILURE_FLOOR = 0.001;
const LATENCY_FACTOR = 2;
const MIN_LATENCY_SAMPLES = 20;
const MAX_MARKER_ROWS = 2_000;
/** Binding a source's fields costs a probe query; the binding holds for this long. */
const FIELDS_TTL_MS = 30 * MINUTE_MS;
/**
 * A source with no marker values, such as one whose collector is down, is checked again sooner:
 * in the lab, a 30-minute "no marker" held change detection back for 14 minutes after the data
 * came back.
 */
const NO_MARKER_TTL_MS = 5 * MINUTE_MS;
const CHANGE_IMPORTANCE = 75;

/** The field that tells a service's versions apart, best first. */
const MARKER_FIELDS = [
  { name: 'service.version', kind: 'version' },
  { name: 'resource.attributes.service.version', kind: 'version' },
  { name: 'service.instance.id', kind: 'instance' },
  { name: 'resource.attributes.service.instance.id', kind: 'instance' },
] as const;

interface Change {
  service: string;
  marker: string;
  kind: 'version' | 'instance';
  markerField: string;
  at: number;
}

interface Side {
  docs: number;
  failures: number;
  requests: number;
  p50Ms?: number;
  durations: number;
}

type MarkerField = (typeof MARKER_FIELDS)[number];

const fieldsCache = new Map<
  string,
  { fields: SourceFields; marker: MarkerField | undefined; at: number }
>();

/**
 * The source's bound fields and the marker field its documents fill. A mapped `service.version`
 * that no service sets would hide every change, so a field must carry values to be chosen.
 */
async function fieldsOf(
  context: StrategyContext,
  source: NightshiftSource
): Promise<{ fields: SourceFields; marker: MarkerField | undefined }> {
  const cached = fieldsCache.get(source.id);
  if (cached && Date.now() - cached.at < (cached.marker ? FIELDS_TTL_MS : NO_MARKER_TTL_MS)) {
    return cached;
  }
  const fields = await bindSourceFields({
    esClient: context.dataEsClient,
    source,
    signal: context.signal,
  });
  const candidates = MARKER_FIELDS.filter((item) => fields.columns.includes(item.name));
  const { rows } =
    candidates.length > 0
      ? await queryRows({
          esClient: context.dataEsClient,
          query: `FROM ${source.view_name}
| WHERE @timestamp >= NOW() - 15 minutes
| STATS ${candidates.map((item, index) => `m${index} = COUNT(${field(item.name)})`).join(', ')}`,
          signal: context.signal,
        })
      : { rows: [] };
  const marker = candidates.find((_, index) => toNumber(rows[0]?.[`m${index}`]) > 0);
  const entry = { fields, marker, at: Date.now() };
  fieldsCache.set(source.id, entry);
  return entry;
}

/**
 * Changes in the last 90 minutes: a version or instance a service started running after it had
 * run another one. A service's first marker is not a change, it is the engine starting to look.
 */
async function findChanges({
  context,
  source,
  markerField,
  kind,
  now,
}: {
  context: StrategyContext;
  source: NightshiftSource;
  markerField: string;
  kind: Change['kind'];
  now: number;
}): Promise<Change[]> {
  const windowStart = now - MARKER_WINDOW_MS;
  const { rows } = await queryRows({
    esClient: context.dataEsClient,
    query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(windowStart, now)} AND ${field('service.name')} IS NOT NULL AND ${field(
      markerField
    )} IS NOT NULL
| STATS first_seen = MIN(@timestamp) BY service = ${field('service.name')}, marker = ${field(
      markerField
    )}
| LIMIT ${MAX_MARKER_ROWS}`,
    signal: context.signal,
  });
  const byService = rows.reduce((groups, row) => {
    const service = String(row.service);
    groups.set(service, [
      ...(groups.get(service) ?? []),
      { marker: String(row.marker), firstSeen: toEpoch(row.first_seen) },
    ]);
    return groups;
  }, new Map<string, Array<{ marker: string; firstSeen: number }>>());
  return [...byService.entries()].flatMap(([service, markers]) =>
    markers
      .filter(
        (item) =>
          item.firstSeen >= windowStart + MARKER_EDGE_MS &&
          item.firstSeen >= now - CHANGE_WATCH_MS &&
          markers.some((other) => other.firstSeen < item.firstSeen)
      )
      .map((item) => ({ service, marker: item.marker, kind, markerField, at: item.firstSeen }))
  );
}

/** Failures, requests and median latency of the new marker since the change, and before it. */
async function compare({
  context,
  source,
  fields,
  change,
  to,
}: {
  context: StrategyContext;
  source: NightshiftSource;
  fields: SourceFields;
  change: Change;
  to: number;
}): Promise<{ before: Side; after: Side; failure: string }> {
  const failure = failureCondition(fields) ?? 'false';
  const request =
    fields.hasStatus || fields.hasDuration
      ? [
          fields.hasStatus ? '_status IS NOT NULL' : undefined,
          fields.hasDuration ? '_duration_ms IS NOT NULL' : undefined,
          `(${failure})`,
        ]
          .filter(Boolean)
          .join(' OR ')
      : 'true';
  const { rows } = await queryRows({
    esClient: context.dataEsClient,
    query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(change.at - BEFORE_WINDOW_MS, to)} AND ${field(
      'service.name'
    )} == ${esqlString(change.service)}
${preludeOf(fields, ['level', 'duration', 'status'])}
| EVAL after = ${field(change.markerField)} == ${esqlString(
      change.marker
    )} AND @timestamp >= TO_DATETIME(${esqlString(
      new Date(Math.max(change.at, to - AFTER_WINDOW_MS)).toISOString()
    )})
| WHERE after OR @timestamp < TO_DATETIME(${esqlString(new Date(change.at).toISOString())})
| STATS docs = COUNT(*), failures = SUM(CASE(${failure}, 1, 0)), requests = SUM(CASE(${request}, 1, 0))${
      fields.hasDuration ? ', p50_ms = MEDIAN(_duration_ms), durations = COUNT(_duration_ms)' : ''
    } BY after`,
    signal: context.signal,
  });
  const sideOf = (after: boolean): Side => {
    const row = rows.find((item) => Boolean(item.after) === after) ?? {};
    return {
      docs: toNumber(row.docs),
      failures: toNumber(row.failures),
      requests: toNumber(row.requests),
      p50Ms: toOptionalNumber(row.p50_ms),
      durations: toNumber(row.durations),
    };
  };
  return { before: sideOf(false), after: sideOf(true), failure };
}

const percent = (ratio: number) =>
  ratio >= 0.1 ? `${Math.round(ratio * 100)}%` : `${(ratio * 100).toFixed(1)}%`;

const describeChange = (change: Change) =>
  `${change.kind === 'version' ? 'version' : 'new instance'} ${change.marker.slice(0, 24)}`;

/**
 * The observations of one change in the latest minute: one for failures, one for latency.
 * Each compares the new version with the service before it, so it needs no baseline of its own,
 * and a failure the service already had before the change is not blamed on it.
 */
function changeObservations({
  source,
  fields,
  change,
  before,
  after,
  failure,
  bucketStart,
}: {
  source: NightshiftSource;
  fields: SourceFields;
  change: Change;
  before: Side;
  after: Side;
  failure: string;
  bucketStart: number;
}): StrategyObservation[] {
  const scoped = fields.hasStatus || fields.hasDuration;
  const beforeN = scoped ? before.requests : before.docs;
  const afterN = scoped ? after.requests : after.docs;
  const beforeRatio = beforeN > 0 ? before.failures / beforeN : 0;
  const afterRatio = afterN > 0 ? after.failures / afterN : 0;
  const pValue =
    afterN > 0
      ? binomialUpperTail({
          count: after.failures,
          trials: afterN,
          probability: Math.max(beforeRatio, NORMAL_FAILURE_FLOOR),
        })
      : 1;
  const failuresUp =
    after.failures >= MIN_FAILURES &&
    afterRatio >= Math.max(FAILURE_FACTOR * beforeRatio, beforeRatio + MIN_FAILURE_EFFECT) &&
    pValue <= FAILURE_P_VALUE;
  const changedAt = new Date(change.at).toISOString();
  const key = shortHash(`${change.service}|${change.marker}`);
  const evidence = `FROM ${source.view_name}
| WHERE @timestamp >= TO_DATETIME(${esqlString(changedAt)}) AND ${field(
    'service.name'
  )} == ${esqlString(change.service)} AND ${field(change.markerField)} == ${esqlString(
    change.marker
  )}
${preludeOf(fields, ['level', 'status'])}
| WHERE ${failure}
| SORT @timestamp DESC
| LIMIT 20`;
  const observations: StrategyObservation[] = [
    {
      fingerprint: `change:${source.id}:${change.service}:${key}`,
      service: change.service,
      bucket_start: bucketStart,
      value: afterRatio,
      unit: 'ratio',
      looks_off: failuresUp,
      title: `${change.service}: failures rose after ${describeChange(change)}`,
      description: `${describeChange(change)} was first seen at ${changedAt.slice(
        11,
        16
      )} UTC. In its last 15 minutes ${after.failures} of ${afterN} ${
        scoped ? 'requests' : 'lines'
      } on it failed (${percent(afterRatio)}), against ${percent(
        beforeRatio
      )} in the half hour before the change.${
        failuresUp ? ` At the earlier rate this many has a chance of ${pValue.toPrecision(2)}.` : ''
      } A change is the commonest trigger of an outage; rolling it back is the first thing to try.`,
      importance: CHANGE_IMPORTANCE,
      evidence_esql: evidence,
      source_id: source.id,
      since: changedAt,
    },
  ];
  if (
    before.p50Ms !== undefined &&
    after.p50Ms !== undefined &&
    before.durations >= MIN_LATENCY_SAMPLES &&
    after.durations >= MIN_LATENCY_SAMPLES
  ) {
    observations.push({
      fingerprint: `change_latency:${source.id}:${change.service}:${key}`,
      service: change.service,
      bucket_start: bucketStart,
      value: after.p50Ms,
      unit: 'ms',
      looks_off: before.p50Ms > 0 && after.p50Ms >= LATENCY_FACTOR * before.p50Ms,
      title: `${change.service}: slower after ${describeChange(change)}`,
      description: `Median latency ${Math.round(after.p50Ms)} ms over ${
        after.durations
      } requests in the last 15 minutes of ${describeChange(
        change
      )}, first seen at ${changedAt.slice(11, 16)} UTC, against ${Math.round(
        before.p50Ms
      )} ms in the half hour before.`,
      importance: CHANGE_IMPORTANCE - 10,
      evidence_esql: evidence,
      source_id: source.id,
      since: changedAt,
    });
  }
  return observations;
}

const logsSourcesOf = (sources: NightshiftSource[]) =>
  sources.filter((source) => source.type === 'logs' || source.type === 'unknown');

async function evaluate(context: StrategyContext): Promise<StrategyEvaluation> {
  // Judged once per run, at the latest settled minute: each comparison covers everything since
  // the change, so earlier minutes of the window would only repeat it.
  const bucketStart = context.to - BUCKET_MS;
  if (bucketStart < context.from) {
    return { observations: [], notes: [] };
  }
  const results = await Promise.all(
    logsSourcesOf(context.sources).map(async (source): Promise<StrategyEvaluation> => {
      try {
        const { fields, marker } = await fieldsOf(context, source);
        if (!marker) {
          return { observations: [], notes: [] };
        }
        const changes = await findChanges({
          context,
          source,
          markerField: marker.name,
          kind: marker.kind,
          now: context.to,
        });
        const observations = await Promise.all(
          changes.map(async (change) => {
            const { before, after, failure } = await compare({
              context,
              source,
              fields,
              change,
              to: context.to,
            });
            return changeObservations({
              source,
              fields,
              change,
              before,
              after,
              failure,
              bucketStart,
            });
          })
        );
        return { observations: observations.flat(), notes: [] };
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
 * Change regressions: what a new version, or a new instance where there is no version, does
 * compared with the service before it. In Google's postmortems 68% of outage triggers were
 * binary or configuration pushes, and Azure's Gandalf catches bad rollouts from exactly this
 * comparison. The engine reads the change from the data itself, so it needs no deploy feed.
 */
export const changeRegressionsStrategy: ISignalStrategy = {
  descriptor: {
    id: 'change_regressions',
    name: STRATEGY_NAME,
    watches:
      'Each new service.version, or new instance where there is no version, for 90 minutes after it appears',
    reportsWhen:
      'The new version fails at least twice as often as the service did in the half hour before (5+ failures, binomial p <= 1e-4), or its median latency doubles',
    // The comparison with the service before the change is the baseline.
    baselinePolicy: 'skip',
    runner: 'direct',
    reportsOnlyFiring: false,
    supportsReplay: false,
    settleMs: 60_000,
  },

  evaluate,
};
