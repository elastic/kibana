/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { HistogramInterval } from '../types/applications';
import { RESULT_COLUMNS, mobileColumn, resultColumn } from './fields';
import { MAX_SERIES_ROWS, toEsqlDuration } from './series';

/** The event EDOT Android and EDOT iOS write once a launch shows its first frame. */
export const APP_START_EVENT = 'elastic.app.start';

/** The `start.type` values the views read, in order; `hot` is reserved by the SDKs and left out. */
export const START_TYPE_LIST = ['cold', 'warm'] as const;
export type StartType = (typeof START_TYPE_LIST)[number];

/**
 * Starts above this are left out: a process started in the background (by a push, a background
 * fetch or iOS prewarm) draws its first frame only when the user opens the app, so its duration
 * says nothing about how fast the app starts, and a few of them would pull an average far up.
 */
export const MAX_APP_START_MS = 60_000;

const START_COLUMNS = {
  cold: { ms: 'coldStartMs', avg: 'coldStart', count: 'coldStarts' },
  warm: { ms: 'warmStartMs', avg: 'warmStart', count: 'warmStarts' },
} as const satisfies Record<StartType, Record<string, keyof typeof RESULT_COLUMNS>>;

/**
 * The duration of a start of `type`, or null for any other document. A duration can be mapped as a
 * `long` in one backing index and a `float` in another, so it's read as a double; `start.type` is
 * read as a string, as any other stream can map it as a number. ES|QL rejects the whole query on a
 * field mapped as two types unless it's converted, which would take the KPIs down with it.
 */
const startDurationOf = (type: StartType) => {
  const duration = esql.exp`TO_DOUBLE(${mobileColumn('appStartDuration')})`;
  return esql.exp`${resultColumn(START_COLUMNS[type].ms)} = CASE(
    ${mobileColumn('eventName')} == ${APP_START_EVENT}
      AND TO_STRING(${mobileColumn('startType')}) == ${type}
      AND ${duration} >= 0
      AND ${duration} <= ${MAX_APP_START_MS},
    ${duration},
    null
  )`;
};

/**
 * Adds the duration of each cold and warm start in its own column, null for every other document,
 * so `appStartStats` can sit in the same `STATS` as the other KPIs.
 */
export const withAppStartDurations = (query: ComposerQuery): ComposerQuery =>
  query.pipe`EVAL ${START_TYPE_LIST.map(startDurationOf)}`;

/** The average and count of cold and warm starts, over `withAppStartDurations`. */
export const appStartStats = (): ESQLSingleAstItem[] =>
  START_TYPE_LIST.flatMap((type) => {
    const { ms, avg, count } = START_COLUMNS[type];
    return [
      esql.exp`${resultColumn(avg)} = AVG(${resultColumn(ms)})`,
      esql.exp`${resultColumn(count)} = COUNT(${resultColumn(ms)})`,
    ];
  });

/** The app starts only: the series reads nothing else. */
const withAppStartEvents = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('eventName')} == ${APP_START_EVENT}`;

/** The cold and warm starts per time bucket, in the request's `time_zone`. */
export const withAppStartSeries = (
  query: ComposerQuery,
  interval: HistogramInterval
): ComposerQuery => {
  const bucket = resultColumn('bucket');
  return withAppStartDurations(withAppStartEvents(query))
    .pipe`STATS ${appStartStats()} BY ${bucket} = TBUCKET(${toEsqlDuration(interval)})`
    .pipe`SORT ${bucket} ASC`.pipe`LIMIT ${MAX_SERIES_ROWS}`;
};

/**
 * The columns of `appStartStats`. Optional: ES|QL drops a column that is null in every row, and an
 * average is null without starts.
 */
export interface AppStartStats {
  [RESULT_COLUMNS.coldStart]?: number | null;
  [RESULT_COLUMNS.coldStarts]?: number;
  [RESULT_COLUMNS.warmStart]?: number | null;
  [RESULT_COLUMNS.warmStarts]?: number;
}

export interface AppStartSeriesRow extends AppStartStats {
  [RESULT_COLUMNS.bucket]: string;
}

/** The average and count of `type` in a row of `appStartStats`; the average is null without starts. */
export const toAppStart = (
  row: AppStartStats | undefined,
  type: StartType
): { avg: number | null; count: number } => {
  const { avg, count } = START_COLUMNS[type];
  const starts = row?.[RESULT_COLUMNS[count]] ?? 0;
  return { avg: starts > 0 ? (row?.[RESULT_COLUMNS[avg]] ?? null) : null, count: starts };
};
