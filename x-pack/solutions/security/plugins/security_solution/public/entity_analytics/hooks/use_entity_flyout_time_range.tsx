/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { FC, PropsWithChildren } from 'react';
import dateMath from '@kbn/datemath';
import type { ScopeTimeRange } from '../common/alert_time_range_overrides';
import { getScopeFlyoutTimeRange } from '../common/alert_time_range_overrides';

/** The `{ from, to }` window (datemath strings) an entity flyout was opened with. */
export type EntityFlyoutTimeRange = ScopeTimeRange;

/** The same window resolved to epoch milliseconds, for APIs that take numeric bounds. */
export interface EntityFlyoutTimeRangeMs {
  from: number;
  to: number;
}

const EntityFlyoutTimeRangeContext = createContext<EntityFlyoutTimeRange | undefined>(undefined);

interface EntityFlyoutTimeRangeProviderProps {
  /**
   * Scope the flyout was opened from. When the scope pins the flyout to a window (see
   * `SCOPE_FLYOUT_TIME_RANGES`), every time-bounded section in the flyout uses that window instead
   * of its own default (Kibana global time, `now-30d`, ...). Other scopes provide no range.
   */
  scopeId?: string;
  /** Explicit window; takes precedence over the one derived from `scopeId`. */
  timeRange?: EntityFlyoutTimeRange;
}

/**
 * Provides the flyout-level time range to every section of an entity flyout. Mount it once at the
 * root of each entity panel / tool flyout; sections read it with {@link useEntityFlyoutTimeRange}.
 */
export const EntityFlyoutTimeRangeProvider: FC<
  PropsWithChildren<EntityFlyoutTimeRangeProviderProps>
> = ({ scopeId, timeRange, children }) => {
  const value = useMemo(() => timeRange ?? getScopeFlyoutTimeRange(scopeId), [scopeId, timeRange]);
  return (
    <EntityFlyoutTimeRangeContext.Provider value={value}>
      {children}
    </EntityFlyoutTimeRangeContext.Provider>
  );
};

/**
 * Returns the time range the enclosing entity flyout was opened with, or `undefined` when the
 * opener did not pin one (callers then fall back to their own default).
 */
export const useEntityFlyoutTimeRange = (): EntityFlyoutTimeRange | undefined =>
  useContext(EntityFlyoutTimeRangeContext);

/** Resolves a datemath `{ from, to }` to epoch milliseconds; `undefined` when either bound is invalid. */
export const entityFlyoutTimeRangeToMs = (
  timeRange: EntityFlyoutTimeRange | undefined
): EntityFlyoutTimeRangeMs | undefined => {
  if (!timeRange) return undefined;
  const from = dateMath.parse(timeRange.from);
  const to = dateMath.parse(timeRange.to, { roundUp: true });
  if (!from?.isValid() || !to?.isValid()) return undefined;
  return { from: from.valueOf(), to: to.valueOf() };
};

/**
 * {@link useEntityFlyoutTimeRange} resolved to epoch milliseconds. Memoised on the datemath strings
 * so the numbers stay stable across renders (safe to use in react-query keys).
 */
export const useEntityFlyoutTimeRangeMs = (): EntityFlyoutTimeRangeMs | undefined => {
  const timeRange = useEntityFlyoutTimeRange();
  const from = timeRange?.from;
  const to = timeRange?.to;
  return useMemo(
    () =>
      entityFlyoutTimeRangeToMs(from !== undefined && to !== undefined ? { from, to } : undefined),
    [from, to]
  );
};
