/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../../../contexts';
import {
  getMonitorLastErrorRunAction,
  selectErrorPopoverState,
  selectLastErrorRunMetadata,
} from '../../../../../state';

interface UseMonitorLatestPingParams {
  monitorId: string;
  locationLabel: string;
  configIdByLocation: string;
}

export const useLatestError = ({
  monitorId,
  locationLabel,
  configIdByLocation,
}: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const isPopoverOpen = useSelector(selectErrorPopoverState);

  const { data: latestPing, loading } = useSelector(selectLastErrorRunMetadata);

  useEffect(() => {
    if (monitorId && locationLabel && isPopoverOpen === configIdByLocation) {
      dispatch(getMonitorLastErrorRunAction.get({ monitorId, locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel, lastRefresh, isPopoverOpen, configIdByLocation]);

  return { loading, latestPing };
};
