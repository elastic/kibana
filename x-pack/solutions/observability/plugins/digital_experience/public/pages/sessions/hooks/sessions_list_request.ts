/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import { getDateISORange } from '@kbn/timerange';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { useTimeRange, type TimeRange } from '../../../hooks/use_time_range';
import { DURATION_BUCKETS } from '../../../utils/sessions_list_query';
import type { SessionsListState } from './use_sessions_list_query';

/**
 * The query of the sessions list API for the list's state, time range and environment: the same for
 * the Sessions tab and the list beside a session.
 */
export const sessionsListRequestQuery = ({
  timeRange,
  environment,
  state,
}: {
  timeRange: TimeRange;
  environment: string | undefined;
  state: SessionsListState;
}) => {
  const { startDate, endDate } = getDateISORange({
    from: timeRange.rangeFrom,
    to: timeRange.rangeTo,
  });
  const duration = DURATION_BUCKETS.find(({ id }) => id === state.duration);
  return omitBy(
    {
      start: startDate,
      end: endDate,
      query: state.search,
      browser: state.browser,
      os: state.os,
      country: state.country,
      entryPage: state.entryPage,
      environment,
      withJsErrors: state.withJsErrors ? 'true' : undefined,
      withFailedRequests: state.withFailedRequests ? 'true' : undefined,
      minDurationMs: duration?.minDurationMs,
      maxDurationMs: duration?.maxDurationMs,
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      page: state.page,
      perPage: state.perPage,
    },
    isUndefined
  ) as { start: string; end: string };
};

/**
 * A page of the sessions list for the list's state, in the current time range and environment: the
 * Sessions tab and the list beside a session show the same sessions, so they ask for them the same
 * way. `state` has to keep its identity while it is equal, or each render loads the list again.
 */
export const useSessionsList = ({
  serviceName,
  state,
}: {
  serviceName: string;
  state: SessionsListState;
}) => {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();

  return useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/sessions', {
        signal,
        params: {
          path: { serviceName },
          query: sessionsListRequestQuery({ timeRange, environment, state }),
        },
      }),
    [apiClient, serviceName, timeRange, environment, state],
    { unsetValueOnError: true }
  );
};
