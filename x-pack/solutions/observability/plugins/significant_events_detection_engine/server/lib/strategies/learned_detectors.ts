/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS } from '../../../common';
import type { OwnedRule, StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  bucketStarts,
  esqlString,
  field,
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql';
import { buildSignalRule } from './rule_definitions';
import { latestRowPerKey } from './rule_events_reader';
import type {
  DesiredRules,
  IDetectionStrategy,
  ReplayContext,
  RunningDetector,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'Learned detectors';
/** One `COUNT(*) WHERE` per detector; past this a source gets a second rule. */
const MAX_DETECTORS_PER_RULE = 50;
/** Same cadence as the health checks and KI rules, so a learned detector is as fast. */
const RULE_EVERY = '1m';
const RULE_LOOKBACK = '4m';
const RULE_CLOSED_BUCKETS = 3;
const REPLAY_ROW_LIMIT = 10_000;

export const learnedFingerprint = (detectorId: string) => `learned:${detectorId}`;
const countColumn = (index: number) => `d${index}`;

/** A detector's condition limited to its own service. */
export function scopedCondition(detector: RunningDetector): string {
  return `(${detector.condition}) AND ${field('service.name')} == ${esqlString(detector.service)}`;
}

/** Counts each detector of the chunk per minute; rows exist only for minutes with a match. */
export function detectorCountPipeline(detectors: RunningDetector[]): string {
  const conditions = detectors.map(scopedCondition);
  return `| WHERE ${conditions.map((condition) => `(${condition})`).join(' OR ')}
| STATS ${conditions
    .map((condition, index) => `${countColumn(index)} = COUNT(*) WHERE ${condition}`)
    .join(', ')} BY bucket = BUCKET(@timestamp, 1 minute)`;
}

function chunked<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );
}

function parseDetectorIds(meta: OwnedRule['meta']): string[] {
  try {
    const parsed: unknown = JSON.parse(meta?.detector_ids ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    return [];
  }
}

/**
 * One observation per detector and minute, zero when nothing matched, so the series is dense:
 * the baseline sees the quiet minutes, and an open event sees its problem stop.
 */
export function detectorObservations({
  source,
  detectors,
  buckets,
  countOf,
  ruleId,
}: {
  source: NightshiftSource;
  detectors: RunningDetector[];
  buckets: number[];
  countOf: (bucketStart: number, detector: RunningDetector) => number;
  ruleId?: string;
}): StrategyObservation[] {
  return buckets.flatMap((bucketStart) =>
    detectors.map((detector): StrategyObservation => {
      const value = countOf(bucketStart, detector);
      return {
        fingerprint: learnedFingerprint(detector.detector_id),
        service: detector.service,
        bucket_start: bucketStart,
        value,
        unit: 'count',
        looks_off: value > 0,
        title: detector.title,
        description: `${value} log line(s) on ${detector.service} matched a detector the engine learned: ${detector.description}`,
        importance: detector.importance,
        evidence_esql: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(bucketStart, bucketStart + BUCKET_MS)} AND ${scopedCondition(detector)}
| SORT @timestamp DESC
| LIMIT 20`,
        source_id: source.id,
        rule_id: ruleId,
        trial: detector.mode === 'trial',
      };
    })
  );
}

/** Counts detectors directly from the data, for replay and minutes older than the rule's window. */
export async function countDetectorsDirectly({
  context,
  source,
  detectors,
  from,
  to,
}: {
  context: Pick<ReplayContext, 'dataEsClient' | 'signal'>;
  source: NightshiftSource;
  detectors: RunningDetector[];
  from: number;
  to: number;
}): Promise<StrategyObservation[]> {
  const buckets = bucketStarts(from, to, BUCKET_MS);
  const perChunk = await Promise.all(
    chunked(detectors, MAX_DETECTORS_PER_RULE).map(async (chunk) => {
      const { rows } = await queryRows({
        esClient: context.dataEsClient,
        query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(from, to)}
${detectorCountPipeline(chunk)}
| LIMIT ${REPLAY_ROW_LIMIT}`,
        signal: context.signal,
        timeoutMs: 120_000,
      });
      const byBucket = new Map(rows.map((row) => [toEpoch(row.bucket), row]));
      return detectorObservations({
        source,
        detectors: chunk,
        buckets,
        countOf: (bucketStart, detector) =>
          toNumber(byBucket.get(bucketStart)?.[countColumn(chunk.indexOf(detector))]),
      });
    })
  );
  return perChunk.flat();
}

async function evaluateLive(context: StrategyContext): Promise<StrategyEvaluation> {
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]));
  const rules = context.ownedRules.filter((rule) => sourcesById.has(rule.source_id));
  if (rules.length === 0) {
    return { observations: [], notes: [], watchedRules: 0 };
  }
  const [{ rows, truncated }, detectors] = await Promise.all([
    context.ruleEvents.read({
      ruleIds: rules.map((rule) => rule.rule_id),
      since: context.from,
      maxRows: context.maxRows,
      signal: context.signal,
    }),
    context.getLearnedDetectors(),
  ]);
  const byId = new Map(detectors.map((detector) => [detector.detector_id, detector]));
  const buckets = bucketStarts(context.from, context.to, BUCKET_MS);
  const observations = rules.flatMap((rule) => {
    const source = sourcesById.get(rule.source_id)!;
    const ids = parseDetectorIds(rule.meta);
    // A detector retired since the rule was built is skipped until the rule is rebuilt.
    const ruleDetectors = ids.flatMap((id) => {
      const detector = byId.get(id);
      return detector ? [detector] : [];
    });
    const latest = latestRowPerKey(
      rows.filter((row) => row.rule_id === rule.rule_id),
      (row) => {
        const bucket = toEpoch(row.data.bucket);
        return bucket >= context.from && bucket < context.to ? String(bucket) : undefined;
      }
    );
    return detectorObservations({
      source,
      detectors: ruleDetectors,
      buckets,
      countOf: (bucketStart, detector) =>
        toNumber(
          latest.get(String(bucketStart))?.data[countColumn(ids.indexOf(detector.detector_id))]
        ),
      ruleId: rule.rule_id,
    });
  });
  return { observations, notes: [], truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const detectors = await context.getLearnedDetectors();
  const results = await Promise.all(
    context.sources.map(async (source): Promise<StrategyEvaluation> => {
      const own = detectors.filter((detector) => detector.source_id === source.id);
      if (own.length === 0) {
        return { observations: [], notes: [] };
      }
      try {
        return {
          observations: await countDetectorsDirectly({
            context,
            source,
            detectors: own,
            from: context.from,
            to: context.to,
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
 * Detectors the learning loop wrote, from confirmed investigation paths and missed incidents.
 * Each is a log condition on one service, counted per minute by one Alerting v2 rule per source,
 * and judged by the same baseline check and pipeline as every other strategy. A detector runs as
 * a trial until it passes its acceptance criteria, so a new one never raises before it proved it
 * would have been right.
 */
export const learnedDetectorsStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'learned_detectors',
    name: STRATEGY_NAME,
    watches: 'Log conditions the learning loop wrote from investigations and missed incidents',
    reportsWhen: 'A detector matches at least one log line of its service in the minute',
    baselinePolicy: 'own_history',
    runner: 'alerting_v2_rule',
    reportsOnlyFiring: false,
    supportsReplay: true,
    settleMs: 150_000,
    liveWindowMs: 270_000,
  },

  evaluate: evaluateLive,

  replay: evaluateReplay,

  async desiredRules(context): Promise<DesiredRules> {
    const detectors = await context.getLearnedDetectors();
    const rules = context.sources.flatMap((source) =>
      chunked(
        detectors.filter((detector) => detector.source_id === source.id),
        MAX_DETECTORS_PER_RULE
      ).map((chunk) => ({
        ...buildSignalRule({
          spaceId: context.spaceId,
          strategy: 'learned_detectors',
          strategyName: STRATEGY_NAME,
          source,
          query: `FROM ${source.view_name}
${detectorCountPipeline(chunk)}
| WHERE bucket < DATE_TRUNC(1 minute, NOW()) AND bucket >= DATE_TRUNC(1 minute, NOW()) - ${RULE_CLOSED_BUCKETS} minutes`,
          every: RULE_EVERY,
          lookback: RULE_LOOKBACK,
          groupBy: ['bucket'],
          cpsEnabled: context.cpsEnabled,
        }),
        // The column `d<n>` of a row counts the detector at position n.
        meta: { detector_ids: JSON.stringify(chunk.map((detector) => detector.detector_id)) },
      }))
    );
    return { rules, skipped: [] };
  },
};
