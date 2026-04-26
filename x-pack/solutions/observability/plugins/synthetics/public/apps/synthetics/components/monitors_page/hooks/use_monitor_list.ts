/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useDebounce from 'react-use/lib/useDebounce';
import { useMonitorFiltersState } from '../common/monitor_filters/use_filters';
import type { MonitorListPageState } from '../../../state';
import {
  fetchMonitorListAction,
  quietFetchMonitorListAction,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  updateManagementPageStateAction,
} from '../../../state';
import { useSyntheticsRefreshContext } from '../../../contexts';

export function useMonitorList() {
  const dispatch = useDispatch();
  const isInitialMount = useRef(true);

  const { pageState, loading, loaded, error, data } = useSelector(selectMonitorListState);
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);

  const { handleFilterChange } = useMonitorFiltersState();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const loadPage = useCallback(
    (state: MonitorListPageState) => {
      dispatch(updateManagementPageStateAction(state));
    },
    [dispatch]
  );
  const reloadPage = useCallback(() => loadPage(pageState), [pageState, loadPage]);

  // Periodically refresh
  useEffect(() => {
    if (!isInitialMount.current) {
      dispatch(quietFetchMonitorListAction({ ...pageState }));
    }
    // specifically only want to run this on refreshInterval change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh]);

  // On initial mount fire the request immediately. The previous implementation
  // wrapped this in `useDebounce(100)` which delayed the request by 100ms on
  // top of the saga's own `debounce(300)`. The saga still rate-limits rapid
  // pageState changes, so the client-side delay was pure latency on top of the
  // already-slow `/synthetics/monitors` round trip.
  useEffect(() => {
    if (loaded) {
      dispatch(quietFetchMonitorListAction(pageState));
    } else {
      dispatch(fetchMonitorListAction.get(pageState));
    }
    // Only run once on mount — `pageState` changes are handled by the
    // debounced effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useDebounce(
    () => {
      // Don't load on initial mount, only meant to handle pageState changes
      if (isInitialMount.current || !loaded) {
        // setting false here to account for debounce timing
        isInitialMount.current = false;
        return;
      }
      dispatch(fetchMonitorListAction.get(pageState));
    },
    200,
    [pageState]
  );

  return {
    loading,
    loaded,
    error,
    pageState,
    syntheticsMonitors,
    total: data?.total ?? 0,
    loadPage,
    reloadPage,
    absoluteTotal: data.absoluteTotal ?? 0,
    handleFilterChange,
  };
}
