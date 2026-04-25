/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import type { TrendRequest } from '../../../../../../common/types';
import { selectOverviewTrends, trendStatsBatch } from '../../../state';

export const useOverviewTrendsRequests = (monitorsToFetchTrendsFor: OverviewStatusMetaData[]) => {
  const dispatch = useDispatch();
  const trendData = useSelector(selectOverviewTrends);

  useEffect(() => {
    const trendRequests = monitorsToFetchTrendsFor.reduce((acc, item) => {
      const locationId = item.locations[0]?.id ?? '';
      if (trendData[item.configId + locationId] === undefined) {
        acc.push({
          configId: item.configId,
          locationIds: item.locations.map((loc) => loc.id),
          schedule: item.schedule,
        });
      }
      return acc;
    }, [] as TrendRequest[]);
    if (trendRequests.length) dispatch(trendStatsBatch.get(trendRequests));
  }, [dispatch, monitorsToFetchTrendsFor, trendData]);
};
