/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { HistogramInterval } from '../types/applications';
import type { RESULT_COLUMNS } from './fields';
import { inValues, mobileColumn, resultColumn } from './fields';
import { appStartStats, withAppStartDurations, type AppStartStats } from './app_starts';
import { errorRateStats, kpiStats } from './kpis';
import { MAX_SERIES_ROWS, toEsqlDuration } from './series';

export const TOP_RELEASES = 5;

/** Sessions a release needs in the range to show an error rate. */
export const MIN_RELEASE_SESSIONS = 100;

/** Sessions a time bucket needs to draw an error rate. */
export const MIN_BUCKET_SESSIONS = 10;

/** Empty, so no real release can collide with it: `withRelease` drops empty ones. */
export const OTHER_RELEASE_KEY = '';

/** Documents with a non-empty release. */
export const withRelease = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL AND ${mobileColumn(
    'serviceVersion'
  )} != ""`;

const withReleaseGroup = (query: ComposerQuery, releases: readonly string[]): ComposerQuery =>
  withRelease(query).pipe`EVAL ${resultColumn('releaseGroup')} = CASE(
    ${inValues('serviceVersion', releases)},
    ${mobileColumn('serviceVersion')},
    ${OTHER_RELEASE_KEY}
  )`;

/** The KPIs, app starts and first document of each release in the range, most sessions first. */
export const withReleaseStats = (query: ComposerQuery, limit: number): ComposerQuery =>
  withAppStartDurations(withRelease(query)).pipe`STATS ${kpiStats()}, ${appStartStats()},
      ${resultColumn('firstSeen')} = MIN(@timestamp)
      BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`.pipe`SORT ${resultColumn(
    'sessions'
  )} DESC, ${resultColumn('release')} DESC`.pipe`LIMIT ${limit}`;

/** The KPIs and app starts of every release but `releases` together: the "Other" group. */
export const withOtherReleaseStats = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withAppStartDurations(
    withRelease(query).pipe`WHERE NOT (${inValues('serviceVersion', releases)})`
  ).pipe`STATS ${kpiStats()}, ${appStartStats()}`;

/** Sessions and exceptions per time bucket and group, in the request's `time_zone`. */
export const withReleaseSeries = (
  query: ComposerQuery,
  releases: readonly string[],
  interval: HistogramInterval
): ComposerQuery =>
  withReleaseGroup(query, releases).pipe`STATS ${errorRateStats()}
    BY ${resultColumn('bucket')} = TBUCKET(${toEsqlDuration(interval)}), ${resultColumn(
      'releaseGroup'
    )}`.pipe`SORT ${resultColumn('bucket')} ASC`.pipe`LIMIT ${MAX_SERIES_ROWS}`;

/** Which of `releases` have documents, e.g. before the range. */
export const withReleasesSeen = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withRelease(query).pipe`WHERE ${inValues('serviceVersion', releases)}`
    .pipe`STATS BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`;

/** Optional: ES|QL drops a column that is null in every row. */
interface ReleaseKpis {
  [RESULT_COLUMNS.sessions]?: number;
  [RESULT_COLUMNS.users]?: number;
  [RESULT_COLUMNS.exceptions]?: number;
}

export interface ReleaseStatsRow extends ReleaseKpis, AppStartStats {
  [RESULT_COLUMNS.release]: string;
  [RESULT_COLUMNS.firstSeen]: string;
}

export type OtherReleaseStatsRow = ReleaseKpis & AppStartStats;

export interface ReleaseSeriesRow extends Omit<ReleaseKpis, typeof RESULT_COLUMNS.users> {
  [RESULT_COLUMNS.releaseGroup]: string;
  [RESULT_COLUMNS.bucket]: string;
}

export interface ReleaseSeenRow {
  [RESULT_COLUMNS.release]: string;
}
