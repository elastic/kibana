/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { getSeriesKey } from '../series_key';
import type { DetectionSignalReading, GeneratorContext } from '../types';
import { KNOWN_FAILURES_SETTINGS } from './constants';
import type { MeasuredKnownFailure } from './read_measured_failures';
import { getKnownFailureFingerprint, getKnownFailureRiseFingerprint } from './to_reading';
import type { OpenKnownFailure } from './unusual_minutes';

const MINUTE_MS = 60_000;

/** What earlier ticks reported for one knowledge indicator. */
export interface PastReadings {
  /** Minutes an earlier tick reported as unusual. */
  reported: Set<number>;
  /** The event those minutes left open, if any. */
  open?: OpenKnownFailure;
  /** Minutes an earlier tick reported a rise on. */
  reportedRises: Set<number>;
}

/**
 * What earlier ticks reported for each measured knowledge indicator, in the order given, from one
 * history read of both its series.
 */
export async function readPastReadings({
  context: { history, window, abortSignal },
  measured,
}: {
  context: GeneratorContext;
  measured: MeasuredKnownFailure[];
}): Promise<PastReadings[]> {
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
  const readings = await history.readHistory({
    series: seriesOf.flatMap(({ unusual, rise }) => [unusual, rise]),
    from: getOldestMinute(measured) - KNOWN_FAILURES_SETTINGS.quiet_period_minutes * MINUTE_MS,
    to: window.to,
    abortSignal,
  });

  return measured.map(({ measurements }, index) => ({
    ...readPastMinutes({
      readings: readings.get(getSeriesKey(seriesOf[index].unusual)) ?? [],
      ruleId: measurements[0].rule_id,
    }),
    reportedRises: new Set(
      (readings.get(getSeriesKey(seriesOf[index].rise)) ?? []).map(
        ({ bucket_start: bucketStart }) => bucketStart
      )
    ),
  }));
}

/**
 * The oldest minute any run returned. The history read starts a quiet period before it, so an event
 * that minute could still continue is found. Taken from the rows, not the window: a row is stamped
 * when it is indexed, and a slow query's minutes can start well before the window does.
 */
function getOldestMinute(measured: MeasuredKnownFailure[]): number {
  return Math.min(
    ...measured.flatMap(({ measurements }) => measurements.map(({ minutes }) => minutes[0].minute))
  );
}

/**
 * The unusual minutes already reported for a knowledge indicator, and the event they left open.
 * Every reported minute counts, whichever rule reported it: the store keeps one reading per series
 * and minute, so a second one would hide the first. The open event counts only when the same rule
 * reported it: an edited query gets a new rule, and the threshold saved for the old query says
 * nothing about the new one.
 */
function readPastMinutes({
  readings,
  ruleId,
}: {
  readings: DetectionSignalReading[];
  ruleId: string;
}): Pick<PastReadings, 'reported' | 'open'> {
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
    open: last && { threshold: last.details.threshold as number, last_minute: last.bucket_start },
  };
}
