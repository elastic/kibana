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
import {
  fetchMonitorListAction,
  quietFetchMonitorListAction,
  MonitorListPageState,
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

  // On initial mount, load the page
  useDebounce(
    () => {
      if (isInitialMount.current) {
        if (loaded) {
          dispatch(quietFetchMonitorListAction(pageState));
        } else {
          dispatch(fetchMonitorListAction.get(pageState));
        }
      }
    },
    100,
    // we don't use pageState here, for pageState, useDebounce will handle it
    [dispatch]
  );

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
