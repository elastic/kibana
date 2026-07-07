/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import type { TrendRequest } from '../../../../../../common/types';
import { selectOverviewTrends, trendStatsBatch } from '../../../state';

export const useOverviewTrendsRequests = (monitorsToFetchTrendsFor: OverviewStatusMetaData[]) => {
  const dispatch = useDispatch();
  const trendData = useSelector(selectOverviewTrends);
  const trendDataRef = useRef(trendData);
  trendDataRef.current = trendData;

  useEffect(() => {
    const currentTrends = trendDataRef.current;
    const trendRequests = monitorsToFetchTrendsFor.reduce((acc, item) => {
      // Trend stats are cached per `${configId}${locationId}`, but a single
      // request fetches all locations for a config. Re-fetch when any location
      // is missing from the cache so multi-location monitors aren't skipped.
      const missingLocationIds = item.locations
        .filter((loc) => currentTrends[item.configId + loc.id] === undefined)
        .map((loc) => loc.id);
      if (missingLocationIds.length) {
        acc.push({
          configId: item.configId,
          locationIds: missingLocationIds,
          schedule: item.schedule,
        });
      }
      return acc;
    }, [] as TrendRequest[]);
    if (trendRequests.length) dispatch(trendStatsBatch.get(trendRequests));
  }, [dispatch, monitorsToFetchTrendsFor]);
};
