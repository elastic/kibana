/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
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
 * The key of the "Other" group. A real release is never empty (`withRelease` drops those), so no
 * `service.version` can collide with it.
 */
export const OTHER_RELEASE_KEY = '';

export const OTHER_RELEASE_LABEL = i18n.translate('xpack.digitalExperience.mobile.releases.other', {
  defaultMessage: 'Other',
});

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

/** Sessions, users and exceptions per group, as the KPI row defines them. */
export const withReleaseTotals = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withReleaseGroup(query, releases).pipe`STATS ${kpiStats()} BY ${resultColumn('releaseGroup')}`;

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
  )}`;

/** When each of `releases` first has a document. */
export const withReleaseFirstSeen = (
  query: ComposerQuery,
  releases: readonly string[]
): ComposerQuery =>
  withRelease(query).pipe`WHERE ${inValues('serviceVersion', releases)}`.pipe`STATS ${resultColumn(
    'firstSeen'
  )} = MIN(@timestamp) BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`;

/** The row of `withReleaseTotals`; a column every row has null for is dropped. */
export interface ReleaseTotalsRow {
  [RESULT_COLUMNS.releaseGroup]: string;
  [RESULT_COLUMNS.sessions]?: number;
  [RESULT_COLUMNS.users]?: number;
  [RESULT_COLUMNS.exceptions]?: number;
}

/** The row of `withReleaseSeries`. */
export interface ReleaseSeriesRow extends Omit<ReleaseTotalsRow, typeof RESULT_COLUMNS.users> {
  [RESULT_COLUMNS.bucket]: string;
}

/** The row of `withReleaseFirstSeen`. */
export interface ReleaseFirstSeenRow {
  [RESULT_COLUMNS.release]: string;
  [RESULT_COLUMNS.firstSeen]: string;
}
