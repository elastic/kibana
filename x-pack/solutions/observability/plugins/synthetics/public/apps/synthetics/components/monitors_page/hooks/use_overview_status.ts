/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { selectOverviewPageState } from '../../../state';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
} from '../../../state/overview_status';

/**
 * Read-only hook — returns overview status data from the Redux store without
 * triggering any fetches. Use this in child components that just need the data.
 * The fetch is triggered once by `useOverviewStatus` in the page-level component.
 */
export function useOverviewStatusState() {
  const { status, error, loaded, loading, allConfigs } = useSelector(selectOverviewStatus);
  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
  };
}

/**
 * Fetching hook — triggers the initial overview status fetch and re-fetches on
 * pageState or refresh changes. Should be called ONCE per page, typically in the
 * top-level route component (e.g. `MonitorManagementPage`).
 */
export function useOverviewStatus({ scopeStatusByLocation }: { scopeStatusByLocation: boolean }) {
  const pageState = useSelector(selectOverviewPageState);
  const { status, error, loaded, loading, allConfigs } = useSelector(selectOverviewStatus);
  const isInitialMount = useRef(true);

  const { lastRefresh } = useSyntheticsRefreshContext();

  const dispatch = useDispatch();

  const paramsRef = useRef({ pageState, scopeStatusByLocation, loaded });
  paramsRef.current = { pageState, scopeStatusByLocation, loaded };

  useEffect(() => {
    if (!isInitialMount.current) {
      const { pageState: ps, scopeStatusByLocation: scope } = paramsRef.current;
      dispatch(quietFetchOverviewStatusAction.get({ pageState: ps, scopeStatusByLocation: scope }));
    }
  }, [dispatch, lastRefresh]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (paramsRef.current.loaded) {
        dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
      } else {
        dispatch(fetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
      }
      return;
    }
    if (!paramsRef.current.loaded) return;
    dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
  }, [dispatch, pageState, scopeStatusByLocation]);

  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
  };
}
