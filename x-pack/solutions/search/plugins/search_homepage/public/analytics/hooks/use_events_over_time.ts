/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { useQuery } from '@kbn/react-query';
import { ANALYTICS_EVENTS_OVER_TIME_PATH } from '../../../common/analytics';
import type {
  AnalyticsEventsOverTime,
  AnalyticsEventsOverTimeRequest,
  AnalyticsEventsOverTimeSource,
} from '../../../common/analytics';
import { useKibana } from '../../hooks/use_kibana';
import { ANALYTICS_TELEMETRY_PREFIX } from '../constants';
import { REFRESH_INTERVAL_MS } from './use_analytics_cluster_state';

const EVENTS_OVER_TIME_QUERY_KEY = 'searchHomepageAnalyticsEventsOverTime';

export type EventsOverTimeFailure = 'load' | 'render';

export interface EventsOverTimeResult {
  /** The last counts the server returned, possibly for the previous sources while new ones load. */
  data: AnalyticsEventsOverTime | undefined;
  isLoading: boolean;
  /** True only when there is nothing to show; a failed refresh keeps the earlier counts. */
  hasFailed: boolean;
  /** Counts a failure of the chart in usage telemetry; the chart itself never shows an error. */
  reportFailure: (failure: EventsOverTimeFailure) => void;
}

/**
 * Event counts over time for the given sources, refreshed while the tab is visible. With no
 * sources nothing is requested.
 */
export const useEventsOverTime = (
  sources: readonly AnalyticsEventsOverTimeSource[]
): EventsOverTimeResult => {
  const { http, usageCollection } = useKibana().services;

  const reportFailure = useCallback(
    (failure: EventsOverTimeFailure): void => {
      usageCollection?.reportUiCounter(
        'searchHomepage',
        METRIC_TYPE.COUNT,
        `${ANALYTICS_TELEMETRY_PREFIX}_events_over_time_${failure}_failed`
      );
    },
    [usageCollection]
  );

  const isEnabled = sources.length > 0;
  const { data, isError } = useQuery({
    queryKey: [EVENTS_OVER_TIME_QUERY_KEY, sources],
    queryFn: ({ signal }) => {
      const request: AnalyticsEventsOverTimeRequest = { sources };
      return http.post<AnalyticsEventsOverTime>(ANALYTICS_EVENTS_OVER_TIME_PATH, {
        body: JSON.stringify(request),
        signal,
      });
    },
    enabled: isEnabled,
    retry: false,
    // The chart keeps its bars while another source or a refresh loads.
    keepPreviousData: true,
    refetchOnWindowFocus: true,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    onError: () => reportFailure('load'),
  });

  const visibleData = isEnabled ? data : undefined;

  return {
    data: visibleData,
    isLoading: isEnabled && visibleData === undefined && !isError,
    hasFailed: isEnabled && visibleData === undefined && isError,
    reportFailure,
  };
};
