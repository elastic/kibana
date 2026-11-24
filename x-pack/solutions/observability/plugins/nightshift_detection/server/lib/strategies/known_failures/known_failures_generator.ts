/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { groupBy, sortBy, uniq } from 'lodash';
import { MAX_ROWS } from '../../rules/managed_rule_reader';
import { getSeriesKey } from '../series_key';
import type {
  DetectionSignalGenerator,
  DetectionSignalReading,
  GenerateResult,
  GeneratorContext,
} from '../types';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';
import {
  findUnusualMinutes,
  getLastingRise,
  type LastingRise,
  type OpenKnownFailure,
  type UnusualMinute,
} from './judge_known_failure';
import { getKnownFailureRuleId, getUnwatchableReason } from './known_failure_rule';
import { decodeKnownFailureRow, type KnownFailureMeasurement } from './known_failure_row';
import { resolveEntity } from './resolve_entity';
import {
  getKnownFailureFingerprint,
  toLastingRiseReading,
  toUnusualMinuteReading,
} from './to_reading';

const MINUTE_MS = 60_000;
/**
 * How far back the history read reaches before the window: the newest minutes a run returns start
 * before the window, and an event opened up to a quiet period before them may still be open. One
 * more minute because a run is stamped when its row is indexed, a little after its query read
 * `NOW()`.
 */
const HISTORY_LOOKBACK_MS =
  (KNOWN_FAILURES_SETTINGS.newest_minutes +
    KNOWN_FAILURES_SETTINGS.quiet_period_minutes +
    KNOWN_FAILURES_SETTINGS.end_margin_minutes +
    1) *
  MINUTE_MS;

/** The runs of one Known failures rule in the window, decoded, with the indicator it watches. */
interface MeasuredKnownFailure {
  knowledgeIndicator: QueryLink;
  /** Newest run first. */
  measurements: KnownFailureMeasurement[];
}

/** What the judgement found for one knowledge indicator. */
interface JudgedKnownFailure extends MeasuredKnownFailure {
  unusual: UnusualMinute[];
  rise?: LastingRise;
}

/**
 * Judges what the Known failures rules measured in the window. A rule writes one row per run with
 * its knowledge indicator's newest per-minute counts, normal level and latest step or trend change.
 * The generator reports each unusual minute, and a lasting rise, as a breached reading.
 */
export class KnownFailuresGenerator implements DetectionSignalGenerator {
  public async generate(context: GeneratorContext): Promise<GenerateResult> {
    const { measured, notes, truncated } = await readMeasuredFailures(context);
    if (measured.length === 0) {
      return { readings: [], notes, truncated };
    }

    const judged = await judgeMeasuredFailures({ context, measured });
    const breached = judged.filter(({ unusual, rise }) => unusual.length > 0 || rise !== undefined);
    if (breached.length === 0) {
      return { readings: [], notes, truncated };
    }

    // One read for every source with a breach, instead of one per breach.
    const features = await context.knowledge.listFeatures({
      sourceIds: uniq(breached.map(({ knowledgeIndicator }) => knowledgeIndicator.source_id)),
      types: ['entity'],
    });
    const readings = breached.flatMap((failure) =>
      toReadings({
        failure,
        entity: resolveEntity({ knowledgeIndicator: failure.knowledgeIndicator, features }),
        cpsEnabled: context.cpsEnabled,
      })
    );

    return { readings, notes, truncated };
  }
}

/**
 * 1. Joins the strategy's enabled rules with the knowledge indicators they watch.
 * 2. Reads the rows those rules wrote in the window.
 * 3. Decodes each rule's rows. A rule without a row ran no query in the window, which is noted, not
 *    read as a quiet indicator; a row the rule query could not have written is noted and left out.
 */
async function readMeasuredFailures(context: GeneratorContext): Promise<{
  measured: MeasuredKnownFailure[];
  notes: string[];
  truncated: boolean;
}> {
  const { spaceId, window, rules, abortSignal } = context;

  // 1.
  const { knowledgeIndicatorByRuleId, createdAtByRuleId } = await readWatchedKnowledgeIndicators(
    context
  );
  if (knowledgeIndicatorByRuleId.size === 0) {
    return { measured: [], notes: [], truncated: false };
  }

  // 2.
  const rows = await rules.readRows({
    spaceId,
    ruleIds: [...knowledgeIndicatorByRuleId.keys()],
    from: window.from,
    to: window.to,
    abortSignal,
  });
  // The reader returns rows newest first, and grouping keeps that order within each rule.
  const rowsByRuleId = groupBy(rows, ({ rule_id: ruleId }) => ruleId);

  // 3.
  const notes: string[] = [];
  const measured = [...knowledgeIndicatorByRuleId].flatMap(([ruleId, knowledgeIndicator]) => {
    const ruleRows = rowsByRuleId[ruleId] ?? [];
    if (ruleRows.length === 0) {
      // A rule created during the window, just reconciled, has had no chance to run yet.
      if ((createdAtByRuleId.get(ruleId) ?? 0) >= window.from) {
        return [];
      }
      notes.push(
        `rule [${ruleId}] of knowledge indicator [${knowledgeIndicator.query.id}] wrote no row in the window, so it may not be running`
      );
      return [];
    }
    const measurements = ruleRows.flatMap((row) => decodeKnownFailureRow(row) ?? []);
    if (measurements.length < ruleRows.length) {
      notes.push(`rule [${ruleId}] wrote a row without the Known failures columns`);
    }
    return measurements.length > 0 ? [{ knowledgeIndicator, measurements }] : [];
  });

  // The reader stops at its cap and leaves the window's oldest rows out.
  return { measured, notes, truncated: rows.length >= MAX_ROWS };
}

/**
 * The knowledge indicator each enabled rule watches, by rule id, joined on the id the reconciler
 * gives the indicator's rule, and when each rule was created. Only the tick's enabled sources are
 * read. A disabled rule, or an indicator without a rule, gives nothing.
 */
async function readWatchedKnowledgeIndicators({
  spaceId,
  sources,
  knowledge,
  rules,
  cpsEnabled,
}: GeneratorContext): Promise<{
  knowledgeIndicatorByRuleId: Map<string, QueryLink>;
  createdAtByRuleId: Map<string, number>;
}> {
  const [managedRules, queries] = await Promise.all([
    rules.listManaged({ strategy: KNOWN_FAILURES_STRATEGY_ID }),
    knowledge.listQueries({ sourceIds: sources.map(({ id }) => id) }),
  ]);
  const createdAtByRuleId = new Map(
    managedRules
      .filter(({ enabled }) => enabled)
      .map(({ id, created_at: createdAt }): [string, number] => [id, Date.parse(createdAt)])
  );

  // Two indicators with the same query share a rule id; sorted by id, the same one always wins.
  const knowledgeIndicatorByRuleId = new Map(
    sortBy(queries, ({ query }) => query.id)
      .filter(({ query }) => getUnwatchableReason(query) === undefined)
      .map((query): [string, QueryLink] => [
        getKnownFailureRuleId({ spaceId, query, cpsEnabled }),
        query,
      ])
      .filter(([ruleId]) => createdAtByRuleId.has(ruleId))
  );
  return { knowledgeIndicatorByRuleId, createdAtByRuleId };
}

/**
 * Runs both checks for every measured knowledge indicator. The history read gives each one the
 * minutes an earlier tick already reported and the event it has open.
 */
async function judgeMeasuredFailures({
  context,
  measured,
}: {
  context: GeneratorContext;
  measured: MeasuredKnownFailure[];
}): Promise<JudgedKnownFailure[]> {
  const series = measured.map(({ knowledgeIndicator }) => ({
    fingerprint: getKnownFailureFingerprint(knowledgeIndicator),
    source_id: knowledgeIndicator.source_id,
  }));
  const history = await context.history.readHistory({
    series,
    from: context.window.from - HISTORY_LOOKBACK_MS,
    to: context.window.to,
    abortSignal: context.abortSignal,
  });

  return measured.map((failure, index) => {
    const [newest] = failure.measurements;
    const { reported, open } = readPastMinutes({
      readings: history.get(getSeriesKey(series[index])) ?? [],
      ruleId: newest.rule_id,
    });
    return {
      ...failure,
      unusual: findUnusualMinutes({ measurements: failure.measurements, open, reported }),
      rise: getLastingRise(newest.change),
    };
  });
}

/**
 * The minutes already reported for a knowledge indicator, and the event its unusual minutes left
 * open. Every breached minute counts as reported, whichever check or rule reported it: the store
 * keeps one reading per series and minute, so a second one would hide the first. The open event
 * counts only when the same rule reported it: an edited query gets a new rule, and the threshold
 * saved for the old query says nothing about the new one.
 */
function readPastMinutes({
  readings,
  ruleId,
}: {
  readings: DetectionSignalReading[];
  ruleId: string;
}): { reported: Set<number>; open?: OpenKnownFailure } {
  const breached = readings.filter(({ status }) => status === 'breached');
  const last = sortBy(
    breached.filter(
      ({ rule_id: readingRuleId, details }) =>
        readingRuleId === ruleId &&
        details.check === 'unusual_minute' &&
        typeof details.threshold === 'number'
    ),
    ({ bucket_start: bucketStart }) => bucketStart
  ).pop();

  return {
    reported: new Set(breached.map(({ bucket_start: bucketStart }) => bucketStart)),
    open: last && { threshold: last.details.threshold as number, last_minute: last.bucket_start },
  };
}

/** The readings of one judged knowledge indicator: its unusual minutes, then its lasting rise. */
function toReadings({
  failure,
  entity,
  cpsEnabled,
}: {
  failure: JudgedKnownFailure;
  entity: DetectionSignalReading['entity'];
  cpsEnabled: boolean;
}): DetectionSignalReading[] {
  const { knowledgeIndicator, measurements, unusual, rise } = failure;
  const [newest] = measurements;
  const context = { knowledgeIndicator, ruleId: newest.rule_id, entity, cpsEnabled };
  const lastMinute = newest.minutes[newest.minutes.length - 1]?.minute;

  // The rise sits on the newest minute; when that minute is unusual too, its reading already
  // keeps the event open, and a second reading for the minute would replace it in the store.
  const isRiseMinuteTaken = unusual.some(({ minute }) => minute === lastMinute);

  return [
    ...unusual.map((minute) => toUnusualMinuteReading({ ...context, unusual: minute })),
    ...(rise !== undefined && newest.change && lastMinute !== undefined && !isRiseMinuteTaken
      ? [toLastingRiseReading({ ...context, change: newest.change, rise, lastMinute })]
      : []),
  ];
}
