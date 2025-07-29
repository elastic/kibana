/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../../../../../contexts';
import {
  getMonitorLastErrorRunAction,
  selectErrorPopoverState,
  selectLastErrorRunMetadata,
} from '../../../../../state';

interface UseMonitorLatestPingParams {
  configIdByLocation: string;
  monitor: OverviewStatusMetaData;
}

export const useLatestError = ({ monitor, configIdByLocation }: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const isPopoverOpen = useSelector(selectErrorPopoverState);

  const { data: latestPing, loading } = useSelector(selectLastErrorRunMetadata);

  useEffect(() => {
    const locationLabel = monitor?.locations?.[0]?.label;
    if (locationLabel && isPopoverOpen === configIdByLocation) {
      dispatch(getMonitorLastErrorRunAction.get({ monitorId: monitor.configId, locationLabel }));
    }
  }, [
    dispatch,
    lastRefresh,
    isPopoverOpen,
    configIdByLocation,
    monitor?.locations,
    monitor.configId,
  ]);

  return { loading, latestPing };
};
