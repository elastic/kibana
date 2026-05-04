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
import { setOverviewPageStateAction } from '../../../state/overview';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
} from '../../../state/overview_status';
import { useGetUrlParams } from '../../../hooks';

/**
 * Read-only hook — returns overview status data from the Redux store without
 * triggering any fetches. Use this in child components that just need the data.
 * The fetch is triggered once by `useOverviewStatus` in the page-level component.
 */
export function useOverviewStatusState() {
  const { status, error, loaded, loading, allConfigs, total } = useSelector(selectOverviewStatus);
  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
    total,
  };
}

/**
 * Fetching hook — triggers the initial overview status fetch and re-fetches on
 * pageState or refresh changes. Should be called ONCE per page, typically in the
 * top-level route component (e.g. `MonitorManagementPage`).
 */
export function useOverviewStatus({ scopeStatusByLocation }: { scopeStatusByLocation: boolean }) {
  const pageState = useSelector(selectOverviewPageState);
  const { status, error, loaded, loading, allConfigs, total } = useSelector(selectOverviewStatus);
  const isInitialMount = useRef(true);

  const { lastRefresh } = useSyntheticsRefreshContext();
  const { statusFilter } = useGetUrlParams();

  const dispatch = useDispatch();

  const paramsRef = useRef({ pageState, scopeStatusByLocation, loaded });
  paramsRef.current = { pageState, scopeStatusByLocation, loaded };

  // When the status filter changes, reset to page 1.
  const prevStatusFilterRef = useRef(statusFilter);
  useEffect(() => {
    if (prevStatusFilterRef.current !== statusFilter) {
      prevStatusFilterRef.current = statusFilter;
      dispatch(setOverviewPageStateAction({ page: 1 }));
    }
  }, [dispatch, statusFilter]);

  const { query: urlQuery } = useGetUrlParams();
  const hasUnsyncedUrlQuery = Boolean(urlQuery) && urlQuery !== (pageState.query || '');

  useEffect(() => {
    if (!isInitialMount.current) {
      const { pageState: ps, scopeStatusByLocation: scope } = paramsRef.current;
      dispatch(
        quietFetchOverviewStatusAction.get({
          pageState: ps,
          scopeStatusByLocation: scope,
          statusFilter,
        })
      );
    }
  }, [dispatch, lastRefresh, statusFilter]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hasUnsyncedUrlQuery) {
        return;
      }
    }

    const { loaded: isLoaded } = paramsRef.current;
    if (isLoaded) {
      dispatch(
        quietFetchOverviewStatusAction.get({
          pageState,
          scopeStatusByLocation,
          statusFilter,
        })
      );
    } else {
      dispatch(
        fetchOverviewStatusAction.get({
          pageState,
          scopeStatusByLocation,
          statusFilter,
        })
      );
    }
  }, [dispatch, pageState, scopeStatusByLocation, hasUnsyncedUrlQuery, statusFilter]);

  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
    total,
  };
}
