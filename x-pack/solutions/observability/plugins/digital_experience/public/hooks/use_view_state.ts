/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { DEFAULT_OVERVIEW_PERCENTILE } from '../../common/overview_filters';
import type { SavedViewAttributes } from '../../common/saved_views';
import { useOverviewPercentile, useOverviewSearchParams } from './use_overview_search';
import { useTimeRange } from './use_time_range';
import { useUpdateUrlQuery } from './use_update_url_query';

/** What a view keeps of the Overview, besides its name; the time range is kept apart. */
export type ViewState = Omit<SavedViewAttributes, 'name' | 'description' | 'rangeFrom' | 'rangeTo'>;

export interface CurrentView {
  /** The Overview's filters, query and percentile, as the URL has them. */
  state: ViewState;
  /** The time range, whole, for a view that keeps it. */
  timeRange: Required<Pick<SavedViewAttributes, 'rangeFrom' | 'rangeTo'>>;
}

/** The Overview as it is now, which "Save" keeps. */
export const useCurrentView = (): CurrentView => {
  const { filters, kuery } = useOverviewSearchParams();
  const { percentileParam } = useOverviewPercentile();
  const {
    timeRange: { rangeFrom, rangeTo },
  } = useTimeRange();

  return useMemo(
    () => ({
      state: { filters, kuery, percentile: percentileParam },
      timeRange: { rangeFrom, rangeTo },
    }),
    [filters, kuery, percentileParam, rangeFrom, rangeTo]
  );
};

/**
 * Applies a view to the Overview in one step: its filters, query and percentile replace the ones
 * of the URL, those a view lacks being removed, and its time range does too when it has one.
 */
export const useApplyView = () => {
  const updateUrlQuery = useUpdateUrlQuery();

  return useCallback(
    ({ filters, kuery, percentile, rangeFrom, rangeTo }: SavedViewAttributes) =>
      updateUrlQuery({
        filters,
        kuery,
        // The default stays out of the URL, like when it is picked.
        percentile: percentile === String(DEFAULT_OVERVIEW_PERCENTILE) ? undefined : percentile,
        ...(rangeFrom && rangeTo ? { rangeFrom, rangeTo } : {}),
      }),
    [updateUrlQuery]
  );
};
