/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { getMonitorLastRunAction, selectLastRunMetadata } from '../../../state';
import { useSelectedLocation } from './use_selected_location';
import { useSelectedMonitor } from './use_selected_monitor';
import { useGetUrlParams } from '../../../hooks';

interface UseMonitorLatestPingParams {
  monitorId?: string;
}

export const useMonitorLatestPing = (params?: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitor, isRemote } = useSelectedMonitor();
  const location = useSelectedLocation();
  const { monitorId: urlMonitorId } = useParams<{ monitorId: string }>();
  const {
    locationId: urlLocationId,
    monitorQueryId: urlMonitorQueryId,
    remoteName,
  } = useGetUrlParams();

  // For remote monitors, there is no local saved object so monitor?.id is null.
  // Use monitorQueryId from URL (the `monitor.id` field in ping docs) if available,
  // as it may differ from configId for project monitors.
  const monitorId = params?.monitorId ?? monitor?.id ?? (isRemote && urlMonitorQueryId ? urlMonitorQueryId : urlMonitorId);
  const locationLabel = location?.label;

  const { data: latestPing, loading, loaded } = useSelector(selectLastRunMetadata);

  const latestPingId = latestPing?.monitor.id;
  const latestPingConfigId = latestPing?.[ConfigKey.CONFIG_ID];

  // For remote monitors (especially project monitors), the server query may match
  // by `config_id` rather than `monitor.id`. The returned ping's `monitor.id` (e.g.
  // "project-name-monitor-name") won't match our `monitorId` (the UUID configId from
  // the URL), but `config_id` will. Accept the ping if either field matches.
  const isIdSame =
    latestPingId === monitorId ||
    latestPingConfigId === monitorId ||
    latestPingId === monitor?.[ConfigKey.CUSTOM_HEARTBEAT_ID];

  const isLocationSame = locationLabel
    ? latestPing?.observer?.geo?.name === locationLabel
    : !urlLocationId || latestPing?.observer?.name === urlLocationId;

  const isUpToDate = isIdSame && isLocationSame;

  // For remote monitors, the location may not be in the local locations list,
  // so locationLabel might be undefined. Fall back to locationId for filtering.
  const hasLocationFilter = Boolean(locationLabel || urlLocationId);

  useEffect(() => {
    if (monitorId && (locationLabel || (isRemote && urlLocationId))) {
      dispatch(
        getMonitorLastRunAction.get({
          monitorId,
          ...(locationLabel ? { locationLabel } : {}),
          ...(urlLocationId ? { locationId: urlLocationId } : {}),
          ...(remoteName ? { remoteName } : {}),
        })
      );
    }
  }, [
    dispatch,
    monitorId,
    locationLabel,
    urlLocationId,
    isRemote,
    isUpToDate,
    lastRefresh,
    remoteName,
  ]);

  if (!monitorId || !hasLocationFilter || !latestPing) {
    return { loading, latestPing: undefined, loaded };
  }

  if (!isIdSame || !isLocationSame) {
    return { loading, latestPing: undefined, loaded };
  }

  return { loading, latestPing, loaded };
};
