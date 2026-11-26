/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { groupBy, sortBy, uniq, uniqBy } from 'lodash';
import { getErrorMessage } from '../../errors/get_error_message';
import { MAX_ROWS } from '../../rules/managed_rule_reader';
import { getSeriesKey } from '../series_key';
import type {
  DetectionSignalGenerator,
  DetectionSignalReading,
  GenerateResult,
  GeneratorContext,
} from '../types';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { compileDataStartQuery } from './compile_known_failure_query';
import {
  findRise,
  findUnusualMinutes,
  getRunWindow,
  type KnownFailureRise,
  type OpenKnownFailure,
  type UnusualMinute,
} from './judge_known_failure';
import { getKnownFailureRuleId, getUnwatchableReason } from './known_failure_rule';
import { decodeKnownFailureRow, type KnownFailureMeasurement } from './known_failure_row';
import { resolveEntity } from './resolve_entity';
import {
  getKnownFailureFingerprint,
  getKnownFailureRiseFingerprint,
  toRiseReading,
  toUnusualMinuteReading,
} from './to_reading';

const MINUTE_MS = 60_000;
/**
 * How far back the history read reaches before the window: the newest minutes a run returns start
 * before the window, and before them come the hour their normal level is measured over, whose
 * reported minutes are left out of it, and the quiet period of an event that may still be open. Two
 * more minutes because a run is stamped when its row is indexed, which can be a while after its
 * query read `NOW()`.
 */
const HISTORY_LOOKBACK_MS =
  (KNOWN_FAILURES_SETTINGS.newest_minutes +
    Math.max(
      KNOWN_FAILURES_SETTINGS.baseline_minutes,
      KNOWN_FAILURES_SETTINGS.quiet_period_minutes
    ) +
    KNOWN_FAILURES_SETTINGS.end_margin_minutes +
    2) *
  MINUTE_MS;

/** The runs of one Known failures rule in the window, decoded, with the indicator it watches. */
interface MeasuredKnownFailure {
  knowledgeIndicator: QueryLink;
  /** Newest run first. */
  measurements: KnownFailureMeasurement[];
}

/** A rise that still holds in one run, on that run's newest minute. */
interface RiseAtMinute {
  rise: KnownFailureRise;
  /** Start of the run's newest minute, in epoch milliseconds. */
  lastMinute: number;
}

/** What the judgement found for one knowledge indicator. */
interface JudgedKnownFailure extends MeasuredKnownFailure {
  unusual: UnusualMinute[];
  rises: RiseAtMinute[];
}

/**
 * Judges what the Known failures rules measured in the window. A rule writes one row per run with
 * its knowledge indicator's newest per-minute counts, normal level, latest step or trend change and
 * earlier level. The generator reports each unusual minute, and a rise that still holds, as a
 * breached reading.
 */
export class KnownFailuresGenerator implements DetectionSignalGenerator {
  public async generate(context: GeneratorContext): Promise<GenerateResult> {
    const { measured, notes, truncated } = await readMeasuredFailures(context);
    if (measured.length === 0) {
      return { readings: [], notes, truncated };
    }

    const judged = await judgeMeasuredFailures({ context, measured, notes });
    const breached = judged.filter(({ unusual, rises }) => unusual.length > 0 || rises.length > 0);
    if (breached.length === 0) {
      return { readings: [], notes, truncated };
    }

    // One read for every source with a breach, instead of one per breach.
    const features = await context.knowledge.listFeatures({
      sourceIds: uniq(breached.map(({ knowledgeIndicator }) => knowledgeIndicator.source_id)),
      types: ['entity'],
    });
    const sourceTitleById = new Map(context.sources.map(({ id, title }) => [id, title]));
    const readings = breached.flatMap((failure) =>
      toReadings({
        failure,
        entity: resolveEntity({ knowledgeIndicator: failure.knowledgeIndicator, features }),
        sourceTitle: sourceTitleById.get(failure.knowledgeIndicator.source_id),
        cpsEnabled: context.cpsEnabled,
      })
    );

    return { readings, notes, truncated };
  }
}

/**
 * Each watched knowledge indicator with its Known failures rule's measurements in the window,
 * newest first, the notes on what could not be read, and whether the reader hit its cap. A rule
 * without a row ran no query in the window, which is noted, not read as a quiet indicator.
 */
async function readMeasuredFailures(context: GeneratorContext): Promise<{
  measured: MeasuredKnownFailure[];
  notes: string[];
  truncated: boolean;
}> {
  const { spaceId, window, rules, abortSignal } = context;

  // 1. Joins the strategy's enabled rules with the knowledge indicators they watch.
  const { knowledgeIndicatorByRuleId, createdAtByRuleId, unwatched } =
    await readWatchedKnowledgeIndicators(context);
  const notes = unwatched.map(
    ({ query, isDisabled }) =>
      `knowledge indicator [${query.query.id}] has ${
        isDisabled ? 'a disabled' : 'no'
      } Known failures rule, so it is not watched`
  );
  if (knowledgeIndicatorByRuleId.size === 0) {
    return { measured: [], notes, truncated: false };
  }

  // 2. Reads the rows those rules wrote in the window, grouped by rule.
  const rows = await rules.readRows({
    spaceId,
    ruleIds: [...knowledgeIndicatorByRuleId.keys()],
    from: window.from,
    to: window.to,
    abortSignal,
  });
  // The reader returns rows newest first, and grouping keeps that order within each rule.
  const rowsByRuleId = groupBy(rows, ({ rule_id: ruleId }) => ruleId);

  // 3. Decodes each rule's rows; a row the rule query could not have written is noted and left out.
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
 * read. A countable indicator without an enabled rule is returned apart, so it is noted instead of
 * silently going unwatched: its rule failed to be created, was turned off, or has another id.
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
  unwatched: Array<{ query: QueryLink; isDisabled: boolean }>;
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

  const disabledRuleIds = new Set(
    managedRules.filter(({ enabled }) => !enabled).map(({ id }) => id)
  );

  const countable = queries
    .filter((link) => getUnwatchableReason(link) === undefined)
    .map((query) => ({ query, ruleId: getKnownFailureRuleId({ spaceId, query, cpsEnabled }) }));
  return {
    knowledgeIndicatorByRuleId: new Map(
      countable
        .filter(({ ruleId }) => createdAtByRuleId.has(ruleId))
        .map(({ query, ruleId }): [string, QueryLink] => [ruleId, query])
    ),
    createdAtByRuleId,
    unwatched: countable
      .filter(({ ruleId }) => !createdAtByRuleId.has(ruleId))
      .map(({ query, ruleId }) => ({ query, isDisabled: disabledRuleIds.has(ruleId) })),
  };
}

/**
 * Runs both checks for every measured knowledge indicator. The history read gives each one the
 * minutes an earlier tick already reported and the event it has open. When a check finds something,
 * it runs again knowing when the source's data begins: the minutes before count as zero matches, so
 * a new source would look like a rise.
 *
 * Only the start is guarded, not a gap. A source back from an outage that emptied the whole baseline
 * hour still has documents from before it, so its return can be reported. Telling that gap from a
 * sparse index that was only quiet would take another read per breach, and a false report costs
 * less than a missed failure.
 */
async function judgeMeasuredFailures({
  context,
  measured,
  notes,
}: {
  context: GeneratorContext;
  measured: MeasuredKnownFailure[];
  /** Filled with what the judgement could not do. */
  notes: string[];
}): Promise<JudgedKnownFailure[]> {
  const seriesOf = measured.map(({ knowledgeIndicator }) => ({
    unusual: {
      fingerprint: getKnownFailureFingerprint(knowledgeIndicator),
      source_id: knowledgeIndicator.source_id,
    },
    rise: {
      fingerprint: getKnownFailureRiseFingerprint(knowledgeIndicator),
      source_id: knowledgeIndicator.source_id,
    },
  }));
  const history = await context.history.readHistory({
    series: seriesOf.flatMap(({ unusual, rise }) => [unusual, rise]),
    from: context.window.from - HISTORY_LOOKBACK_MS,
    to: context.window.to,
    abortSignal: context.abortSignal,
  });

  const readDataFrom = memoizeDataStart(context);
  return Promise.all(
    measured.map(async (failure, index) => {
      const { measurements } = failure;
      const { reported, reportedCounts, open } = readPastMinutes({
        readings: history.get(getSeriesKey(seriesOf[index].unusual)) ?? [],
        ruleId: measurements[0].rule_id,
      });
      const reportedRises = new Set(
        (history.get(getSeriesKey(seriesOf[index].rise)) ?? []).map(
          ({ bucket_start: bucketStart }) => bucketStart
        )
      );
      // The oldest run reaches furthest back, so the data start lookup covers every run's window.
      const { start } = getRunWindow(measurements[measurements.length - 1]);
      const judge = (dataFrom?: number) => ({
        unusual: findUnusualMinutes({ measurements, open, reported, reportedCounts, dataFrom }),
        rises: findRises({ measurements, reported: reportedRises, dataFrom }),
      });

      const unguarded = judge();
      if (unguarded.unusual.length === 0 && unguarded.rises.length === 0) {
        return { ...failure, ...unguarded };
      }
      const { knowledgeIndicator } = failure;
      try {
        // Read from before the window, so an index that was only quiet in the window's first
        // minutes is not taken for one whose data had not begun.
        const dataFrom = await readDataFrom({
          esql: knowledgeIndicator.query.esql.query,
          from: start - KNOWN_FAILURES_SETTINGS.data_start_lookback_minutes * MINUTE_MS,
        });
        return { ...failure, ...judge(dataFrom) };
      } catch (error) {
        // Fail open: a check that found something reports it, though it may be a source warming up.
        notes.push(
          `could not tell when the data of knowledge indicator [${
            knowledgeIndicator.query.id
          }] begins: ${getErrorMessage(error)}`
        );
        return { ...failure, ...unguarded };
      }
    })
  );
}

/**
 * The rise of each run that still holds, on the run's newest minute. Every run counts, not only the
 * newest: a tick that reads two runs reports what two ticks reading one each would, so a rise that
 * held in the older run and faded by the newer one is not lost. A minute an earlier tick already
 * reported a rise on is skipped, and two runs ending on the same minute count once, the newer.
 */
function findRises({
  measurements,
  reported,
  dataFrom,
}: {
  /** Newest run first. */
  measurements: KnownFailureMeasurement[];
  /** Minutes an earlier tick already reported a rise on. */
  reported: Set<number>;
  dataFrom?: number;
}): RiseAtMinute[] {
  return uniqBy(
    measurements.map((measurement) => ({ measurement, ...getRunWindow(measurement) })),
    ({ lastMinute }) => lastMinute
  ).flatMap(({ measurement, lastMinute }) => {
    if (reported.has(lastMinute)) {
      return [];
    }
    const rise = findRise({ measurement, dataFrom });
    return rise ? [{ rise, lastMinute }] : [];
  });
}

/**
 * Reads when the data of a knowledge indicator's index begins, from `from` on, as the start of that
 * minute, and throws when there is no data from `from` on. Remembered per query for the
 * tick, so the indicators of one `FROM` whose rules ran in the same minute share one read.
 */
function memoizeDataStart({ esClient, cpsEnabled, abortSignal }: GeneratorContext) {
  const dataFromByQuery = new Map<string, Promise<number>>();
  return ({ esql, from }: { esql: string; from: number }): Promise<number> => {
    const query = compileDataStartQuery({ esql, from, cpsEnabled });
    const cached = dataFromByQuery.get(query);
    if (cached) {
      return cached;
    }
    // Whole or not at all: a shard with the older documents failing would move the start later
    // and hide a real breach, where a failed lookup fails open.
    const dataFrom = esClient.esql
      .query({ query, allow_partial_results: false }, { signal: abortSignal })
      .then(({ values }) => {
        const [[first] = []] = values;
        const firstMs = typeof first === 'string' ? Date.parse(first) : Number.NaN;
        if (!Number.isFinite(firstMs)) {
          // The rule counted matches in this range, so an empty answer contradicts it: the service
          // account may not see the index the rule reads. The caller notes it and fails open.
          throw new Error('found no data where the rule counted matches');
        }
        return Math.floor(firstMs / MINUTE_MS) * MINUTE_MS;
      });
    dataFromByQuery.set(query, dataFrom);
    return dataFrom;
  };
}

/**
 * The unusual minutes already reported for a knowledge indicator, their counts, and the event they
 * left open. Every reported minute counts, whichever rule reported it: the store keeps one reading
 * per series and minute, so a second one would hide the first. The counts and the open event count
 * only when the same rule reported them: an edited query gets a new rule, and what the old query
 * counted says nothing about the new one.
 */
function readPastMinutes({
  readings,
  ruleId,
}: {
  readings: DetectionSignalReading[];
  ruleId: string;
}): { reported: Set<number>; reportedCounts: Map<number, number>; open?: OpenKnownFailure } {
  const breached = readings.filter(({ status }) => status === 'breached');
  const unusual = breached.filter(({ details }) => details.check === 'unusual_minute');
  const last = sortBy(
    unusual.filter(
      ({ rule_id: readingRuleId, details }) =>
        readingRuleId === ruleId && typeof details.threshold === 'number'
    ),
    ({ bucket_start: bucketStart }) => bucketStart
  ).pop();

  return {
    reported: new Set(breached.map(({ bucket_start: bucketStart }) => bucketStart)),
    // The same rule only: an edited query's old rule counted other lines.
    reportedCounts: new Map(
      unusual.flatMap(({ rule_id: readingRuleId, bucket_start: bucketStart, value }) =>
        readingRuleId === ruleId && typeof value === 'number' ? [[bucketStart, value] as const] : []
      )
    ),
    open: last && { threshold: last.details.threshold as number, last_minute: last.bucket_start },
  };
}

/** The readings of one judged knowledge indicator: its unusual minutes, then its rises. */
function toReadings({
  failure,
  entity,
  sourceTitle,
  cpsEnabled,
}: {
  failure: JudgedKnownFailure;
  entity: DetectionSignalReading['entity'];
  sourceTitle?: string;
  cpsEnabled: boolean;
}): DetectionSignalReading[] {
  const { knowledgeIndicator, measurements, unusual, rises } = failure;
  const context = {
    knowledgeIndicator,
    ruleId: measurements[0].rule_id,
    entity,
    sourceTitle,
    cpsEnabled,
  };

  return [
    ...unusual.map((minute) => toUnusualMinuteReading({ ...context, unusual: minute })),
    ...rises.map(({ rise, lastMinute }) => toRiseReading({ ...context, rise, lastMinute })),
  ];
}
