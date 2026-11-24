/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ComparedValue } from '../types/applications';
import type { RESULT_COLUMNS } from './fields';
import { mobileColumn, resultColumn } from './fields';

/** The period of equal length that ends where `[start, end)` starts. */
export const getPreviousPeriod = (
  startMs: number,
  endMs: number
): { start: number; end: number } => ({ start: startMs - (endMs - startMs), end: startMs });

/** `current` against `previous`; the delta is missing when either is. */
export const toComparedValue = (
  current: number | null,
  previous: number | null
): ComparedValue => ({
  value: current,
  previous,
  delta: current !== null && previous !== null ? current - previous : null,
});

/** The KPIs as `STATS` fields: sessions, users and exceptions; an unmapped field counts 0. */
export const kpiStats = (): ESQLSingleAstItem[] => [
  esql.exp`${resultColumn('sessions')} = COUNT_DISTINCT(${mobileColumn('sessionId')})`,
  esql.exp`${resultColumn('users')} = COUNT_DISTINCT(${mobileColumn('installationId')})`,
  esql.exp`${resultColumn('exceptions')} = COUNT(${mobileColumn('exceptionType')})`,
];

/** The KPIs of the documents, and their count, which tells whether there is any data. */
export const withKpiStats = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS ${[esql.exp`${resultColumn('docs')} = COUNT(*)`, ...kpiStats()]}`;

/** The row of `withKpiStats`. A column every row has null for is dropped, so any can be missing. */
export interface KpiRow {
  [RESULT_COLUMNS.docs]: number;
  [RESULT_COLUMNS.sessions]: number;
  [RESULT_COLUMNS.users]: number;
  [RESULT_COLUMNS.exceptions]: number;
}
