/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { getErrorMessage } from '../../errors/get_error_message';
import type {
  DetectionSignalGenerator,
  DetectionSignalReading,
  GenerateResult,
  GeneratorContext,
} from '../types';
import { KNOWN_FAILURES_SETTINGS } from './constants';
import { getRunWindow } from './known_failure_row';
import { memoizeDataStart } from './read_data_start';
import { readMeasuredFailures, type MeasuredKnownFailure } from './read_measured_failures';
import { readPastReadings } from './read_past_readings';
import { findRises, type RiseAtMinute } from './rises';
import { resolveEntity } from './resolve_entity';
import { toRiseReading, toUnusualMinuteReading } from './to_reading';
import { findUnusualMinutes, type UnusualMinute } from './unusual_minutes';

const MINUTE_MS = 60_000;

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
  const past = await readPastReadings({ context, measured });
  const readDataFrom = memoizeDataStart(context);
  return Promise.all(
    measured.map(async (failure, index) => {
      const { measurements } = failure;
      const { reported, open, reportedRises } = past[index];
      // The oldest run reaches furthest back, so the data start lookup covers every run's window.
      const { start } = getRunWindow(measurements[measurements.length - 1]);
      const judge = (dataFrom?: number) => ({
        unusual: findUnusualMinutes({ measurements, open, reported, dataFrom }),
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
