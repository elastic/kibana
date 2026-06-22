/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import {
  ConfigKey,
  isRemoteSyntheticsMonitor,
  type Ping,
} from '../../../../../../common/runtime_types';
import { useGetUrlParams } from '../../../hooks';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { getMonitorLastRunAction, selectLastRunMetadata } from '../../../state';
import { fetchLatestTestRun } from '../../../state/monitor_details/api';
import { useSelectedLocation } from './use_selected_location';
import { useSelectedMonitor } from './use_selected_monitor';

interface UseMonitorLatestPingParams {
  monitorId?: string;
}

export const useMonitorLatestPing = (params?: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { remoteName } = useGetUrlParams();
  const isRemote = Boolean(remoteName);

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const monitorId = params?.monitorId ?? monitor?.id;
  const locationLabel = location?.label;

  const { data: latestPing, loading, loaded } = useSelector(selectLastRunMetadata);

  // Mirror of the SO-backed REST route but issued client-side via CCS so the
  // remote branch never depends on Redux state populated by the local route.
  // Called unconditionally to obey the rules of hooks; short-circuits inside
  // when remoteName/monitorId are unavailable.
  const remote = useRemoteMonitorLatestPing({ monitorId, locationLabel, remoteName });

  const latestPingId = latestPing?.monitor.id;

  // CUSTOM_HEARTBEAT_ID is the project-monitor override on the local SO; remote
  // monitors don't expose it (their `monitor.id` already equals the ping's
  // monitor.id), so the equality check above is sufficient for remote.
  const customHeartbeatId =
    monitor && !isRemoteSyntheticsMonitor(monitor)
      ? monitor[ConfigKey.CUSTOM_HEARTBEAT_ID]
      : undefined;
  const isIdSame = latestPingId === monitorId || latestPingId === customHeartbeatId;

  const isLocationSame = latestPing?.observer?.geo?.name === locationLabel;

  const isUpToDate = isIdSame && isLocationSame;

  useEffect(() => {
    // The local SO-backed route can't see remote heartbeat indices, so the
    // dispatch would always come back empty for remote configIds. Skip it.
    if (!isRemote && monitorId && locationLabel) {
      dispatch(getMonitorLastRunAction.get({ monitorId, locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel, isUpToDate, lastRefresh, isRemote]);

  if (isRemote) {
    return remote;
  }

  if (!monitorId || !locationLabel || !latestPing) {
    return { loading, latestPing: undefined, loaded };
  }

  if (!isIdSame || !isLocationSame) {
    return { loading, latestPing: undefined, loaded };
  }

  return { loading, latestPing, loaded };
};

/**
 * Remote (CCS) variant of the latest-ping lookup. Calls the same SO-backed
 * `LATEST_TEST_RUN` route as the local branch but forwards `remoteName` so the
 * route targets `${remoteName}:synthetics-*` via Cross-Cluster Search. Going
 * through the route (instead of a client-side ES search) gives us the route's
 * escalating `@timestamp` fallback (now-1d → now-1w → now-30d) so the query
 * prunes frozen-tier shards, and the `searchExcludedDataTiers` exclusion that
 * `SyntheticsEsClient` applies server-side. Used only by the remote branch of
 * {@link useMonitorLatestPing}, and deliberately kept out of Redux so it never
 * depends on state populated by the local route.
 *
 * Loading semantics: while we wait for `useSelectedMonitor` to resolve the
 * remote monitor (and therefore `monitorId`), `loaded` stays `false` so the
 * page wrapper keeps showing the loading spinner instead of flashing the
 * "initial test run pending" empty state.
 */
const useRemoteMonitorLatestPing = ({
  monitorId,
  locationLabel,
  remoteName,
}: {
  monitorId: string | undefined;
  locationLabel: string | undefined;
  remoteName: string | undefined;
}): { latestPing: Ping | undefined; loading: boolean; loaded: boolean } => {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const canQuery = Boolean(remoteName && monitorId);

  const fetchRemoteLatestPing = useCallback(() => {
    if (!canQuery || !monitorId) {
      return Promise.resolve(undefined);
    }
    return fetchLatestTestRun({ monitorId, locationLabel, remoteName });
  }, [canQuery, monitorId, locationLabel, remoteName]);

  // `lastRefresh` re-triggers the fetch on each refresh tick (parity with the
  // local branch); passing the callback by reference keeps it out of the body.
  const { data, status } = useFetcher(fetchRemoteLatestPing, [fetchRemoteLatestPing, lastRefresh]);

  const isLoading = status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING;

  return {
    latestPing: canQuery ? data?.ping : undefined,
    loading: canQuery ? isLoading : Boolean(remoteName),
    // `loaded` once the fetch settles (success or failure): an unreachable
    // remote cluster surfaces as the empty state, not a perpetual spinner.
    loaded: canQuery ? !isLoading : false,
  };
};
