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

export const useOverviewTrendsRequests = (
  monitorsSortedByStatus: OverviewStatusMetaData[],
  maxItem: number,
  rowCount: number
) => {
  const dispatch = useDispatch();

  const trendData = useSelector(selectOverviewTrends);

  useEffect(() => {
    // We add 1 to maxItem to fetch one extra row so the scrolling looks smooth
    const visibleMonitors = monitorsSortedByStatus.slice(0, (maxItem + 1) * rowCount);

    const trendRequests = visibleMonitors.reduce((acc, item) => {
      if (trendData[item.configId + item.locationId] === undefined) {
        acc.push({
          configId: item.configId,
          locationId: item.locationId,
          schedule: item.schedule,
        });
      }
      return acc;
    }, [] as TrendRequest[]);
    if (trendRequests.length) dispatch(trendStatsBatch.get(trendRequests));
  }, [dispatch, maxItem, monitorsSortedByStatus, rowCount, trendData]);
};
