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
import { errorRateStats, kpiStats } from './kpis';

/** The releases shown by name; the others are grouped as "Other". */
export const TOP_RELEASES = 5;

/** The sessions a release needs in the range for its error rate to be shown. */
export const MIN_RELEASE_SESSIONS = 100;

/** The sessions a bucket of the time series needs for its error rate to be drawn. */
export const MIN_BUCKET_SESSIONS = 10;

/**
 * The rows the time series may have, above ES|QL's default of 1,000, which a long range of daily
 * buckets for six groups passes; the histogram keeps the buckets far below it.
 */
export const MAX_SERIES_ROWS = 10_000;

/**
 * The key of the "Other" group. A real release is never empty (`withRelease` drops those), so no
 * `service.version` can collide with it.
 */
export const OTHER_RELEASE_KEY = '';

/** Documents with a release: an empty `service.version` names none. */
export const withRelease = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL AND ${mobileColumn(
    'serviceVersion'
  )} != ""`;

const DURATION_UNITS: Readonly<Record<HistogramInterval['unit'], string>> = {
  s: 'second',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/** A histogram interval as an ES|QL duration, e.g. `30 seconds` or `1 day`. */
export const toEsqlDuration = ({ value, unit }: HistogramInterval): string =>
  `${value} ${DURATION_UNITS[unit]}${value === 1 ? '' : 's'}`;

/** The releases of `releases` as their own group, the rest as `OTHER_RELEASE_KEY`. */
const withReleaseGroup = (query: ComposerQuery, releases: readonly string[]): ComposerQuery =>
  withRelease(query).pipe`EVAL ${resultColumn('releaseGroup')} = CASE(
    ${inValues('serviceVersion', releases)},
    ${mobileColumn('serviceVersion')},
    ${OTHER_RELEASE_KEY}
  )`;

/**
 * Sessions, users and exceptions per release, as the KPI row defines them, and when each first
 * has a document in the range: the releases with most sessions (then the highest), up to `limit`.
 */
export const withReleaseStats = (query: ComposerQuery, limit: number): ComposerQuery =>
  withRelease(query).pipe`STATS ${kpiStats()}, ${resultColumn('firstSeen')} = MIN(@timestamp)
      BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`.pipe`SORT ${resultColumn(
    'sessions'
  )} DESC, ${resultColumn('release')} DESC`.pipe`LIMIT ${limit}`;

/** The same stats for every release but `releases`, together: the "Other" group. */
export const withOtherReleaseStats = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withRelease(query).pipe`WHERE NOT (${inValues('serviceVersion', releases)})`
    .pipe`STATS ${kpiStats()}`;

/**
 * Sessions and exceptions per bucket of `interval` and group, for the charts, which show no users.
 * The buckets follow the request's `time_zone`.
 */
export const withReleaseSeries = (
  query: ComposerQuery,
  releases: readonly string[],
  interval: HistogramInterval
): ComposerQuery =>
  withReleaseGroup(query, releases).pipe`STATS ${errorRateStats()}
    BY ${resultColumn('bucket')} = TBUCKET(${toEsqlDuration(interval)}), ${resultColumn(
    'releaseGroup'
  )}`.pipe`SORT ${resultColumn('bucket')} ASC`.pipe`LIMIT ${MAX_SERIES_ROWS}`;

/** Which of `releases` have a document, e.g. before the range, so they don't first appear in it. */
export const withReleasesSeen = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withRelease(query).pipe`WHERE ${inValues('serviceVersion', releases)}`
    .pipe`STATS BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`;

/** The KPIs of a row of the release queries; a column every row has null for is dropped. */
interface ReleaseKpis {
  [RESULT_COLUMNS.sessions]?: number;
  [RESULT_COLUMNS.users]?: number;
  [RESULT_COLUMNS.exceptions]?: number;
}

/** The row of `withReleaseStats`. */
export interface ReleaseStatsRow extends ReleaseKpis {
  [RESULT_COLUMNS.release]: string;
  [RESULT_COLUMNS.firstSeen]: string;
}

/** The row of `withOtherReleaseStats`. */
export type OtherReleaseStatsRow = ReleaseKpis;

/** The row of `withReleaseSeries`. */
export interface ReleaseSeriesRow extends Omit<ReleaseKpis, typeof RESULT_COLUMNS.users> {
  [RESULT_COLUMNS.releaseGroup]: string;
  [RESULT_COLUMNS.bucket]: string;
}

/** The row of `withReleasesSeen`. */
export interface ReleaseSeenRow {
  [RESULT_COLUMNS.release]: string;
}
