/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';
import { useMonitorLatestPing } from './use_monitor_latest_ping';
import { useGetUrlParams } from '../../../hooks';
import {
  getMonitorRecentPingsAction,
  selectMonitorPingsMetadata,
  selectStatusFilter,
} from '../../../state';

interface UseMonitorPingsProps {
  lastRefresh?: number;
  pageSize?: number;
  pageIndex?: number;
  from?: string;
  to?: string;
}

export const useMonitorPings = (props?: UseMonitorPingsProps) => {
  const dispatch = useDispatch();

  const { monitor, isRemote } = useSelectedMonitor();
  const location = useSelectedLocation();
  const { remoteName } = useGetUrlParams();
  const { monitorId: urlMonitorId } = useParams<{ monitorId: string }>();
  const { latestPing } = useMonitorLatestPing();

  // Remote monitors have no local saved object, so `monitor?.id` is null and
  // the `useSelectedLocation` lookup returns null because the location is
  // not in the local locations list. Derive both from sources that *are*
  // available for remote monitors:
  //   - `monitorId` falls back to the URL configId (`queryPings` matches by
  //     `monitor.id` OR `config_id`, so either works).
  //   - `locationLabel` falls back to `observer.geo.name` from the latest
  //     ping, mirroring how `useMonitorQueryFilters` resolves the location
  //     for remote monitors.
  const monitorId = monitor?.id ?? (isRemote ? urlMonitorId : undefined);
  const locationLabel =
    location?.label ?? (isRemote ? latestPing?.observer?.geo?.name : undefined);

  const statusFilter = useSelector(selectStatusFilter);

  useEffect(() => {
    if (monitorId && locationLabel) {
      dispatch(
        getMonitorRecentPingsAction.get({
          monitorId,
          locationId: locationLabel,
          size: props?.pageSize,
          pageIndex: props?.pageIndex,
          from: props?.from,
          to: props?.to,
          statusFilter,
          ...(remoteName ? { remoteName } : {}),
        })
      );
    }
  }, [
    dispatch,
    monitorId,
    locationLabel,
    props?.lastRefresh,
    props?.pageSize,
    props?.pageIndex,
    props?.from,
    props?.to,
    statusFilter,
    remoteName,
  ]);

  const { total, data: pings, loading } = useSelector(selectMonitorPingsMetadata);

  return {
    loading,
    total,
    pings,
  };
};
