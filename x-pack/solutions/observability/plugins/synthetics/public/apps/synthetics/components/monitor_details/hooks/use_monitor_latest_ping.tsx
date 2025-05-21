/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { getMonitorLastRunAction, selectLastRunMetadata } from '../../../state';
import { useSelectedLocation } from './use_selected_location';
import { useSelectedMonitor } from './use_selected_monitor';

interface UseMonitorLatestPingParams {
  monitorId?: string;
}

export const useMonitorLatestPing = (params?: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const monitorId = params?.monitorId ?? monitor?.id;
  const locationLabel = location?.label;

  const { data: latestPing, loading, loaded } = useSelector(selectLastRunMetadata);

  const latestPingId = latestPing?.monitor.id;

  const isIdSame =
    latestPingId === monitorId || latestPingId === monitor?.[ConfigKey.CUSTOM_HEARTBEAT_ID];

  const isLocationSame = latestPing?.observer?.geo?.name === locationLabel;

  const isUpToDate = isIdSame && isLocationSame;

  useEffect(() => {
    if (monitorId && locationLabel) {
      dispatch(getMonitorLastRunAction.get({ monitorId, locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel, isUpToDate, lastRefresh]);

  if (!monitorId || !locationLabel || !latestPing) {
    return { loading, latestPing: undefined, loaded };
  }

  if (!isIdSame || !isLocationSame) {
    return { loading, latestPing: undefined, loaded };
  }

  return { loading, latestPing, loaded };
};
