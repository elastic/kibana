/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_ALERTS_TO,
} from '../components/home/constants';
import { TIME_RANGE_OPTIONS, type TimeRange } from '../components/home/entities_grid/common';

/** Each time range has its own scope, so flyouts from the table read alerts over the range it shows. */
export const getEntityAnalyticsNewHomeScopeId = (timeRange: TimeRange): string =>
  `entity-analytics-new-entities-table-${timeRange}`;

/** A relative or absolute `{ from, to }` window, in datemath strings. */
export interface ScopeTimeRange {
  from: string;
  to: string;
}

/** {@link ScopeTimeRange} resolved to epoch milliseconds, for APIs that take numeric bounds. */
export interface ScopeTimeRangeMs {
  from: number;
  to: number;
}

/**
 * Scopes whose opener pins the WHOLE entity flyout (observed data, anomalies, highlights, graph,
 * alerts) to a window: the new Entity Analytics home page selection. Flyout sections look their
 * `scopeId` up here with {@link getScopeFlyoutTimeRange} and fall back to their own default
 * (Kibana global time, `now-30d`, ...) when it is not pinned.
 */
export const SCOPE_FLYOUT_TIME_RANGES: Readonly<Record<string, ScopeTimeRange>> =
  Object.fromEntries(
    TIME_RANGE_OPTIONS.map((timeRange) => [
      getEntityAnalyticsNewHomeScopeId(timeRange),
      { from: `now-${timeRange}`, to: ENTITY_ANALYTICS_ALERTS_TO },
    ])
  );

/** Returns the flyout-level time range pinned by `scopeId`, if any. */
export const getScopeFlyoutTimeRange = (scopeId?: string): ScopeTimeRange | undefined =>
  scopeId ? SCOPE_FLYOUT_TIME_RANGES[scopeId] : undefined;

/**
 * {@link getScopeFlyoutTimeRange} resolved to epoch milliseconds (`to` rounded up). Resolves "now"
 * at call time, so memoise the result where it feeds a query key.
 */
export const getScopeFlyoutTimeRangeMs = (scopeId?: string): ScopeTimeRangeMs | undefined => {
  const timeRange = getScopeFlyoutTimeRange(scopeId);
  if (!timeRange) return undefined;
  const from = dateMath.parse(timeRange.from);
  const to = dateMath.parse(timeRange.to, { roundUp: true });
  if (!from?.isValid() || !to?.isValid()) return undefined;
  return { from: from.valueOf(), to: to.valueOf() };
};

/**
 * Maps a scope ID to the alert query time range that should be used when an
 * entity flyout or insights tab is opened from that scope. Components look up
 * their `scopeId` here and, when a match is found, use the returned `{ from, to }`
 * instead of the global Kibana time range.
 *
 * Add an entry here whenever a new surface pins alerts (only) to a fixed window; surfaces that
 * pin the whole flyout belong in {@link SCOPE_FLYOUT_TIME_RANGES}, which is included here.
 */
export const SCOPE_ALERT_TIME_RANGE_OVERRIDES: Readonly<Record<string, ScopeTimeRange>> = {
  [ENTITY_ANALYTICS_TABLE_ID]: {
    from: ENTITY_ANALYTICS_ALERTS_FROM,
    to: ENTITY_ANALYTICS_ALERTS_TO,
  },
  ...SCOPE_FLYOUT_TIME_RANGES,
};
