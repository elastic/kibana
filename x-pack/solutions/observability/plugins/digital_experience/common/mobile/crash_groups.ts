/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression, ESQLColumn } from '@elastic/esql/types';
import { CRASH_EVENTS, OTEL_LOGS_INDEX } from '../otel_data';
import { MOBILE_MAX_CRASH_DELAY_HOURS } from '../sessions';
import { ERROR_GROUPS_ROWS } from '../top_rows';
import { crashFingerprint, isIosReport, reportOsVersion, reportRelease } from './crash_fingerprint';
import { mobileDocuments } from './documents';
import type { RESULT_COLUMNS } from './fields';
import { inValues, mobileColumn, resultColumn } from './fields';
import { mobilePanelQuery, type MobilePanelFilters } from './filters';

/**
 * How far past the range the `@timestamp` filter of a crash query reaches: EDOT iOS sends a crash
 * on the next launch, which is its `@timestamp`.
 */
export const CRASH_DELAY_MS = MOBILE_MAX_CRASH_DELAY_HOURS * 60 * 60 * 1000;

/**
 * How far back from the end of the range, at least, a group's first crash is looked for, and the
 * older releases it crashed on.
 */
export const CRASH_NEW_LOOKBACK_DAYS = 30;

export interface CrashEventsParams extends MobilePanelFilters {
  start: number;
  end: number;
}

/**
 * When a crash happened: the earlier of `@timestamp` and its observed time, as EDOT iOS sends a
 * crash on the next launch with only its observed time set to the crash. An observed time from
 * before a crash can be sent late is no crash time, e.g. the zero an exporter can leave.
 */
const crashTimeOf = (): ESQLAstExpression => {
  const observed = esql.exp`TO_DATETIME(${mobileColumn('observedTimestamp')})`;
  // The arithmetic is on the observed time: `@timestamp` reads as `NULL` where no index maps it.
  return esql.exp`LEAST(@timestamp, CASE(
    ${observed} + ${esql.exp(`${MOBILE_MAX_CRASH_DELAY_HOURS} hours`)} >= @timestamp,
    ${observed},
    @timestamp
  ))`;
};

/** A keyword that is `NULL` when empty, as some SDKs send an empty value for none. */
const nonEmpty = (column: ESQLAstExpression): ESQLAstExpression =>
  esql.exp`CASE(${column} != "", ${column}, NULL)`;

/**
 * The crashes of an application that `inRange` keeps by their `crash_time`, the earlier of their
 * two times, each with its `crash_release` and `crash_os_version`, the release and OS that crashed:
 * EDOT iOS sends a crash with the resource of the next launch, which may run an update, so an iOS
 * report's own lines win. The release filter is on `crash_release`.
 */
const crashesInRange = (
  { release, ...filters }: MobilePanelFilters,
  inRange: (query: ComposerQuery, crashTime: ESQLColumn) => ComposerQuery
): ComposerQuery => {
  const crashTime = resultColumn('crashTime');
  const crashRelease = resultColumn('crashRelease');
  const crashes = mobilePanelQuery(filters, mobileDocuments({ indices: [OTEL_LOGS_INDEX] }))
    .pipe`WHERE ${inValues('eventName', CRASH_EVENTS)}`.pipe`EVAL ${crashTime} = ${crashTimeOf()}`;
  const crashOsVersion = resultColumn('crashOsVersion');
  const query = inRange(crashes, crashTime).pipe`EVAL ${crashRelease} = ${reportRelease()},
      ${crashOsVersion} = ${reportOsVersion()}`.pipe`EVAL
      ${crashRelease} = COALESCE(${nonEmpty(crashRelease)}, ${nonEmpty(
    mobileColumn('serviceVersion')
  )}),
      ${crashOsVersion} = COALESCE(${nonEmpty(crashOsVersion)}, ${nonEmpty(
    mobileColumn('osVersion')
  )})`;
  return release ? query.pipe`WHERE ${crashRelease} == ${{ release }}` : query;
};

/** The crashes of an application that happened in `[start, end)`, as `crashesInRange` reads them. */
export const crashEvents = ({ start, end, ...filters }: CrashEventsParams): ComposerQuery =>
  crashesInRange(
    filters,
    (query, crashTime) =>
      query.pipe`WHERE ${crashTime} >= TO_DATETIME(${{
        crash_start: new Date(start).toISOString(),
      }}) AND ${crashTime} < TO_DATETIME(${{ crash_end: new Date(end).toISOString() }})`
  );

/**
 * The crashes as Discover lists them, in its time range. Discover filters its time field, the
 * column first compared with `?_tstart`, on that range itself, so it is `observed_timestamp`: when
 * the SDK observed the crash, which OTel sets on every log record and EDOT iOS sets to the crash's
 * time, while `@timestamp` can be the next launch's. The crashes are the Crashes tab's: they
 * happened in the range, and were sent up to `MOBILE_MAX_CRASH_DELAY_HOURS` after it.
 */
export const crashEventsInDiscoverRange = (filters: MobilePanelFilters): ComposerQuery =>
  crashesInRange(
    filters,
    (query, crashTime) => query.pipe`WHERE ${mobileColumn(
      'observedTimestamp'
    )} >= ?_tstart AND ${mobileColumn('observedTimestamp')} < ?_tend
      AND @timestamp >= ?_tstart
      AND @timestamp < TO_DATETIME(?_tend) + ${esql.exp(`${MOBILE_MAX_CRASH_DELAY_HOURS} hours`)}
      AND ${crashTime} >= ?_tstart AND ${crashTime} < ?_tend`
  );

/** How many releases the Crashes tab's picker lists, at most. */
export const CRASH_RELEASE_ROWS = 1000;

/** The crashes per `crash_release`, most first (then the higher release), for the release picker. */
export const withCrashReleaseCounts = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS ${resultColumn('events')} = COUNT(*)
      BY ${resultColumn('release')} = ${resultColumn('crashRelease')}`.pipe`SORT ${resultColumn(
    'events'
  )} DESC, ${resultColumn('release')} DESC`.pipe`LIMIT ${CRASH_RELEASE_ROWS}`;

/** The row of `withCrashReleaseCounts`. */
export interface CrashReleaseRow {
  [RESULT_COLUMNS.release]?: string | null;
  [RESULT_COLUMNS.events]: number;
}

/**
 * Keeps the crashes that can be in a group of one of `types`, before the costly fingerprint: a
 * computed fingerprint hashes the type, so all of its crashes have it (`null` for none), while a
 * stored one can be of any type. Only for types of crashes whose fingerprint was computed: a
 * group's computed crashes can have another type than a stored one's.
 */
export const withCrashTypes = (
  query: ComposerQuery,
  types: ReadonlyArray<string | null>
): ComposerQuery => {
  const exceptionType = mobileColumn('exceptionType');
  const named = [...new Set(types.filter((type): type is string => Boolean(type)))];
  const conditions = [
    esql.exp`${mobileColumn('exceptionFingerprint')} IS NOT NULL`,
    ...(named.length > 0 ? [inValues('exceptionType', named)] : []),
    // The fingerprint reads a missing type as an empty one.
    ...(types.some((type) => !type)
      ? [esql.exp`${exceptionType} IS NULL OR ${exceptionType} == ""`]
      : []),
  ];
  return query.pipe`WHERE ${conditions.reduce(
    (either, condition) => esql.exp`${either} OR ${condition}`
  )}`;
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
      ${users} = COUNT_DISTINCT(${nonEmpty(mobileColumn('installationId'))}),
      ${events} = COUNT(*),
      ${resultColumn('sessions')} = COUNT_DISTINCT(${nonEmpty(mobileColumn('sessionId'))}),
      ${resultColumn('firstSeen')} = MIN(${crashTime}),
      ${resultColumn('lastSeen')} = MAX(${crashTime}),
      ${resultColumn('exceptionType')} = LAST(${mobileColumn('exceptionType')}, ${crashTime}),
      ${resultColumn('message')} = LAST(${mobileColumn('exceptionMessage')}, ${crashTime}),
      ${resultColumn('firstRelease')} = FIRST(${resultColumn('crashRelease')}, ${crashTime}),
      ${resultColumn('lastRelease')} = LAST(${resultColumn('crashRelease')}, ${crashTime}),
      ${resultColumn('iosReports')} = COUNT(*) WHERE ${isIosReport()},
      ${resultColumn('storedFingerprints')} = COUNT(*) WHERE ${mobileColumn(
    'exceptionFingerprint'
  )} IS NOT NULL
    BY ${resultColumn('fingerprint')}`.pipe`SORT ${users} DESC, ${events} DESC`
    .pipe`LIMIT ${ERROR_GROUPS_ROWS}`;
};

/** The releases each of `fingerprints` crashed on, and its first crash. */
export const withCrashGroupHistory = (
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
  const crashTime = resultColumn('crashTime');
  return query.pipe`WHERE ${isListed}`.pipe`STATS
      ${resultColumn('releases')} = VALUES(${resultColumn('crashRelease')}),
      ${resultColumn('unversioned')} = COUNT(*) WHERE ${resultColumn('crashRelease')} IS NULL,
      ${resultColumn('iosReports')} = COUNT(*) WHERE ${isIosReport()},
      ${resultColumn('firstSeen')} = MIN(${crashTime}),
      ${resultColumn('firstRelease')} = FIRST(${resultColumn('crashRelease')}, ${crashTime})
    BY ${fingerprint}`.pipe`LIMIT ${fingerprints.length}`;
};

/** The row of `withCrashGroupStats`: the first crash is the range's. */
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
  /** Crashes reported as EDOT iOS reports, whose fingerprint changes with every build. */
  [RESULT_COLUMNS.iosReports]?: number | null;
  /** Crashes whose fingerprint was stored, so of any type, rather than computed from their type. */
  [RESULT_COLUMNS.storedFingerprints]?: number | null;
}

/** The row of `withCrashGroupHistory`: one release is a string, several an array. */
export interface CrashGroupHistoryRow {
  [RESULT_COLUMNS.fingerprint]: string;
  [RESULT_COLUMNS.releases]?: string | string[] | null;
  /** Crashes without a release, which `releases` leaves out. */
  [RESULT_COLUMNS.unversioned]?: number | null;
  /** EDOT iOS reports in the lookback, which the range's crashes of the group may not have. */
  [RESULT_COLUMNS.iosReports]?: number | null;
  [RESULT_COLUMNS.firstSeen]: string;
  [RESULT_COLUMNS.firstRelease]?: string | null;
}

/** The crashes of one group. */
export const withCrashGroup = (query: ComposerQuery, fingerprint: string): ComposerQuery =>
  query.pipe`WHERE ${resultColumn('fingerprint')} == ${{ fingerprint }}`;

/** A group's latest crash, with its stack trace and session. */
export const withLatestCrash = (query: ComposerQuery): ComposerQuery =>
  query.pipe`SORT ${resultColumn('crashTime')} DESC`.pipe`LIMIT 1`.pipe`EVAL
      ${resultColumn('exceptionType')} = ${mobileColumn('exceptionType')},
      ${resultColumn('message')} = ${mobileColumn('exceptionMessage')},
      ${resultColumn('stacktrace')} = ${mobileColumn('exceptionStacktrace')},
      ${resultColumn('release')} = ${resultColumn('crashRelease')},
      ${resultColumn('osVersion')} = ${resultColumn('crashOsVersion')},
      ${resultColumn('deviceModel')} = ${CRASH_BREAKDOWNS.deviceModels()},
      ${resultColumn('sessionId')} = ${nonEmpty(mobileColumn('sessionId'))},
      ${resultColumn('storedFingerprint')} = ${mobileColumn('exceptionFingerprint')},
      ${resultColumn('reportedAt')} = @timestamp`.pipe`KEEP ${[
    resultColumn('crashTime'),
    resultColumn('reportedAt'),
    resultColumn('exceptionType'),
    resultColumn('message'),
    resultColumn('stacktrace'),
    resultColumn('release'),
    resultColumn('osVersion'),
    resultColumn('deviceModel'),
    resultColumn('sessionId'),
    resultColumn('storedFingerprint'),
  ]}`;

/** What a crash group is broken down by in its detail. */
export const CRASH_BREAKDOWNS: Readonly<
  Record<'releases' | 'osVersions' | 'deviceModels', () => ESQLAstExpression>
> = {
  releases: () => resultColumn('crashRelease'),
  osVersions: () => resultColumn('crashOsVersion'),
  // The identifier where the name is missing or empty.
  deviceModels: () =>
    esql.exp`COALESCE(${nonEmpty(mobileColumn('deviceModelName'))}, ${nonEmpty(
      mobileColumn('deviceModelIdentifier')
    )})`,
};

export type CrashBreakdownName = keyof typeof CRASH_BREAKDOWNS;

/** Values a breakdown shows before "Other". */
export const CRASH_BREAKDOWN_TOP = 5;

/**
 * The crashes per value of a breakdown, most first, each row with the group's crashes in all, so
 * "Other" holds every crash the top values leave out. Crashes without a value have a `null` one,
 * which can take a row: one more than the top values leaves room for it.
 */
export const withCrashBreakdown = (
  query: ComposerQuery,
  name: CrashBreakdownName
): ComposerQuery => {
  const count = resultColumn('count');
  const value = resultColumn('value');
  const total = resultColumn('total');
  return query.pipe`INLINE STATS ${total} = COUNT(*)`
    .pipe`STATS ${count} = COUNT(*), ${total} = MAX(${total}) BY ${value} = ${CRASH_BREAKDOWNS[
    name
  ]()}`.pipe`SORT ${count} DESC, ${value}`.pipe`LIMIT ${CRASH_BREAKDOWN_TOP + 1}`;
};

/** The row of `withLatestCrash`. */
export interface LatestCrashRow {
  [RESULT_COLUMNS.crashTime]: string;
  [RESULT_COLUMNS.reportedAt]: string;
  [RESULT_COLUMNS.exceptionType]?: string | null;
  [RESULT_COLUMNS.message]?: string | null;
  [RESULT_COLUMNS.stacktrace]?: string | null;
  [RESULT_COLUMNS.release]?: string | null;
  [RESULT_COLUMNS.osVersion]?: string | null;
  [RESULT_COLUMNS.deviceModel]?: string | null;
  [RESULT_COLUMNS.sessionId]?: string | null;
  /** Set when the crash's fingerprint was stored, so its type says nothing of the group's. */
  [RESULT_COLUMNS.storedFingerprint]?: string | null;
}

/** The row of `withCrashBreakdown`. */
export interface CrashBreakdownRow {
  [RESULT_COLUMNS.count]: number;
  [RESULT_COLUMNS.total]: number;
  [RESULT_COLUMNS.value]?: string | null;
}
