/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { CRASH_EVENTS, OTEL_LOGS_INDEX } from '../otel_data';
import { MOBILE_MAX_CRASH_DELAY_HOURS } from '../sessions';
import { crashFingerprint } from './crash_fingerprint';
import { mobileDocuments } from './documents';
import { inValues, mobileColumn, resultColumn } from './fields';
import { mobilePanelQuery, type MobilePanelFilters } from './filters';

/**
 * How far past the range the `@timestamp` filter of a crash query reaches: EDOT iOS sends a crash
 * on the next launch, which is its `@timestamp`.
 */
export const CRASH_DELAY_MS = MOBILE_MAX_CRASH_DELAY_HOURS * 60 * 60 * 1000;

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
