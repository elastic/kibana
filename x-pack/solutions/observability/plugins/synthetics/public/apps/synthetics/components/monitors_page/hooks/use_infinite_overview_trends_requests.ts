/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { OverviewStatusMetaData } from '../overview/types';
import { useOverviewTrendsRequests } from './use_overview_trends_requests';

export interface UseInfiniteOverviewTrendsRequestsParams {
  monitorsSortedByStatus: OverviewStatusMetaData[];
  sliceToFetch: {
    startIndex: number;
    endIndex: number;
  } | null;
  numOfColumns: number;
}

const EMPTY_MONITORS: OverviewStatusMetaData[] = [];

export const useInfiniteOverviewTrendsRequests = ({
  monitorsSortedByStatus,
  sliceToFetch,
  numOfColumns,
}: UseInfiniteOverviewTrendsRequestsParams) => {
  const monitorsToFetchTrendsFor = useMemo(
    () =>
      sliceToFetch
        ? monitorsSortedByStatus.slice(
            sliceToFetch.startIndex * numOfColumns,
            (sliceToFetch.endIndex + 1) * numOfColumns
          )
        : EMPTY_MONITORS,
    [monitorsSortedByStatus, sliceToFetch, numOfColumns]
  );
  useOverviewTrendsRequests(monitorsToFetchTrendsFor);
};
