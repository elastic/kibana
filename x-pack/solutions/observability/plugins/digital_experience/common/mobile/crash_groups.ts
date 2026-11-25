/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ComposerQuery } from '@elastic/esql';
import { CRASH_EVENTS, OTEL_LOGS_INDEX } from '../otel_data';
import { MOBILE_MAX_CRASH_DELAY_HOURS } from '../sessions';
import { ERROR_GROUPS_ROWS } from '../top_rows';
import { crashFingerprint } from './crash_fingerprint';
import { mobileDocuments } from './documents';
import type { RESULT_COLUMNS } from './fields';
import { inValues, mobileColumn, resultColumn } from './fields';
import { mobilePanelQuery, type MobilePanelFilters } from './filters';

/**
 * How far past the range the `@timestamp` filter of a crash query reaches: EDOT iOS sends a crash
 * on the next launch, which is its `@timestamp`.
 */
export const CRASH_DELAY_MS = MOBILE_MAX_CRASH_DELAY_HOURS * 60 * 60 * 1000;

/** How far back from the end of the range a group is looked for in older releases. */
export const CRASH_NEW_LOOKBACK_DAYS = 30;

export interface CrashEventsParams extends MobilePanelFilters {
  start: number;
  end: number;
}

/**
 * The crashes of an application that happened in `[start, end)`, each with its `crash_time`, the
 * earlier of its two times.
 */
export const crashEvents = ({ start, end, ...filters }: CrashEventsParams): ComposerQuery => {
  const crashTime = resultColumn('crashTime');
  return mobilePanelQuery(filters, mobileDocuments({ indices: [OTEL_LOGS_INDEX] })).pipe`WHERE ${inValues(
    'eventName',
    CRASH_EVENTS
  )}`.pipe`EVAL ${crashTime} = LEAST(@timestamp, COALESCE(TO_DATETIME(${mobileColumn(
    'observedTimestamp'
  )}), @timestamp))`.pipe`WHERE ${crashTime} >= TO_DATETIME(${{
    crash_start: new Date(start).toISOString(),
  }}) AND ${crashTime} < TO_DATETIME(${{ crash_end: new Date(end).toISOString() }})`;
};

/** Adds each crash's group as `fingerprint`. */
export const withCrashFingerprint = (query: ComposerQuery): ComposerQuery =>
  query.pipe`EVAL ${resultColumn('fingerprint')} = ${crashFingerprint()}`;

/**
 * One row per crash group, the most affected users first: a device stuck in a crash loop inflates
 * the events, not the users.
 */
export const withCrashGroupStats = (query: ComposerQuery): ComposerQuery => {
  const crashTime = resultColumn('crashTime');
  const users = resultColumn('users');
  const events = resultColumn('events');
  return query.pipe`STATS
      ${users} = COUNT_DISTINCT(${mobileColumn('installationId')}),
      ${events} = COUNT(*),
      ${resultColumn('sessions')} = COUNT_DISTINCT(${mobileColumn('sessionId')}),
      ${resultColumn('firstSeen')} = MIN(${crashTime}),
      ${resultColumn('lastSeen')} = MAX(${crashTime}),
      ${resultColumn('exceptionType')} = LAST(${mobileColumn('exceptionType')}, ${crashTime}),
      ${resultColumn('message')} = LAST(${mobileColumn('exceptionMessage')}, ${crashTime}),
      ${resultColumn('firstRelease')} = FIRST(${mobileColumn('serviceVersion')}, ${crashTime}),
      ${resultColumn('lastRelease')} = LAST(${mobileColumn('serviceVersion')}, ${crashTime})
    BY ${resultColumn('fingerprint')}`.pipe`SORT ${users} DESC, ${events} DESC`
    .pipe`LIMIT ${ERROR_GROUPS_ROWS}`;
};

/** The releases each of `fingerprints` crashed on. */
export const withCrashGroupReleases = (
  query: ComposerQuery,
  fingerprints: readonly string[]
): ComposerQuery => {
  const fingerprint = resultColumn('fingerprint');
  const isListed = Builder.expression.func.binary('in', [
    fingerprint,
    Builder.expression.list.tuple({
      values: fingerprints.map((value) => Builder.expression.literal.string(value)),
    }),
  ]);
  return query.pipe`WHERE ${isListed}`.pipe`STATS ${resultColumn(
    'releases'
  )} = VALUES(${mobileColumn('serviceVersion')})
      BY ${fingerprint}`.pipe`LIMIT ${fingerprints.length}`;
};

/** The row of `withCrashGroupStats`. */
export interface CrashGroupRow {
  [RESULT_COLUMNS.fingerprint]: string;
  [RESULT_COLUMNS.users]: number;
  [RESULT_COLUMNS.events]: number;
  [RESULT_COLUMNS.sessions]: number;
  [RESULT_COLUMNS.firstSeen]: string;
  [RESULT_COLUMNS.lastSeen]: string;
  [RESULT_COLUMNS.exceptionType]?: string | null;
  [RESULT_COLUMNS.message]?: string | null;
  [RESULT_COLUMNS.firstRelease]?: string | null;
  [RESULT_COLUMNS.lastRelease]?: string | null;
}

/** The row of `withCrashGroupReleases`: one release is a string, several an array. */
export interface CrashGroupReleasesRow {
  [RESULT_COLUMNS.fingerprint]: string;
  [RESULT_COLUMNS.releases]?: string | string[] | null;
}
