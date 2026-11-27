/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { toTimeRangeQuery, type TimeRangeQuery } from '../../../utils/time_range_query';

export interface MobileFiltersQuery extends TimeRangeQuery {
  osName?: string;
  release?: string;
}

export interface MobileFiltersQueryState {
  /** The query the mobile routes take, its relative times resolved when called. */
  toQuery: () => MobileFiltersQuery;
  /** The URL's range and filters, not the times they resolve to: changes when the query does. */
  key: string;
}

/**
 * The URL's range, environment, OS and release, as the mobile routes take them. A fetch calls
 * `toQuery` each time, so a refresh resolves "now" again.
 */
export const useMobileFiltersQuery = (timeZone?: string): MobileFiltersQueryState => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');

  const toQuery = useCallback(
    () => ({ ...toTimeRangeQuery(timeRange, environment, timeZone), osName, release }),
    [timeRange, environment, timeZone, osName, release]
  );
  return { toQuery, key: JSON.stringify([timeRange, environment, timeZone, osName, release]) };
};
