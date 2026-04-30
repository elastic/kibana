/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

  const paramsRef = useRef({ pageState, loaded });
  paramsRef.current = { pageState, loaded };

  const loadPage = useCallback(
    (state: MonitorListPageState) => {
      dispatch(updateManagementPageStateAction(state));
    },
    [dispatch]
  );
  const reloadPage = useCallback(() => {
    dispatch(fetchMonitorListAction.get(paramsRef.current.pageState));
  }, [dispatch]);

  useEffect(() => {
    if (!isInitialMount.current) {
      dispatch(quietFetchMonitorListAction({ ...paramsRef.current.pageState }));
    }
  }, [dispatch, lastRefresh]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (paramsRef.current.loaded) {
        dispatch(quietFetchMonitorListAction(pageState));
      } else {
        dispatch(fetchMonitorListAction.get(pageState));
      }
      return;
    }
    if (!paramsRef.current.loaded) return;
    dispatch(fetchMonitorListAction.get(pageState));
  }, [dispatch, pageState]);

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
