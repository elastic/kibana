/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { selectOverviewGroupBy, selectOverviewPageState, selectOverviewView } from '../../../state';
import { setOverviewPageStateAction } from '../../../state/overview';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
  selectOverviewStatusSettled,
} from '../../../state/overview_status';
import {
  getCardWindowRefreshPayload,
  getGroupedFillPageState,
  isOverviewGrouped,
} from '../../../state/overview_status/window_refresh';
import { useGetUrlParams } from '../../../hooks';

/**
 * Read-only hook — returns overview status data from the Redux store without
 * triggering any fetches. Use this in child components that just need the data.
 * The fetch is triggered once by `useOverviewStatus` in the page-level component.
 */
export function useOverviewStatusState() {
  const {
    status,
    error,
    loaded,
    loading,
    allConfigs,
    total,
    lastRequest,
    refreshThrough,
    fillThrough,
  } = useSelector(selectOverviewStatus);
  const settled = useSelector(selectOverviewStatusSettled);
  return {
    status,
    error,
    loading,
    loaded,
    settled,
    allConfigs: allConfigs ?? [],
    total,
    lastRequest,
    refreshThrough,
    fillThrough,
  };
}

/**
 * Fetching hook — triggers the initial overview status fetch and re-fetches on
 * pageState or refresh changes. Should be called ONCE per page, typically in the
 * top-level route component (e.g. `MonitorManagementPage`).
 */
export function useOverviewStatus({ scopeStatusByLocation }: { scopeStatusByLocation: boolean }) {
  const pageState = useSelector(selectOverviewPageState);
  const { status, error, loaded, loading, allConfigs, total, refreshThrough, fillThrough } =
    useSelector(selectOverviewStatus);
  const settled = useSelector(selectOverviewStatusSettled);
  const isInitialMount = useRef(true);

  const { lastRefresh } = useSyntheticsRefreshContext();
  // Normalize the empty-string default to `undefined` so "no filter" is omitted
  // from the fetch payload (matching the API contract) rather than sent as "".
  const { statusFilter: statusFilterParam } = useGetUrlParams();
  const statusFilter = statusFilterParam || undefined;

  const dispatch = useDispatch();
  const view = useSelector(selectOverviewView);
  const { field: groupField } = useSelector(selectOverviewGroupBy);
  const grouped = isOverviewGrouped(groupField);

  const paramsRef = useRef({
    pageState,
    scopeStatusByLocation,
    loaded,
    loading,
    statusFilter,
    view,
    grouped,
    loadedCount: allConfigs?.length ?? 0,
    refreshThrough,
    fillThrough,
  });
  paramsRef.current = {
    pageState,
    scopeStatusByLocation,
    loaded,
    loading,
    statusFilter,
    view,
    grouped,
    loadedCount: allConfigs?.length ?? 0,
    refreshThrough,
    fillThrough,
  };

  // Tracks the last status filter the fetch effect reconciled, so it can detect
  // a filter change and reset pagination in the same pass (avoiding a cross-effect race).
  const prevStatusFilterRef = useRef(statusFilter);

  const { query: urlQuery } = useGetUrlParams();
  const hasUnsyncedUrlQuery = Boolean(urlQuery) && urlQuery !== (pageState.query || '');

  // Auto-refresh path: quietly re-fetch the current page when the refresh timer
  // ticks. Params are read from the ref (not deps) so this never re-runs on
  // filter/pageState changes — which would otherwise fetch with a stale page.
  useEffect(() => {
    if (!isInitialMount.current) {
      const {
        pageState: ps,
        scopeStatusByLocation: scope,
        statusFilter: sf,
        view: currentView,
        grouped: isGrouped,
        loadedCount,
        loading: isLoading,
        refreshThrough: inFlightWindowRefresh,
        fillThrough: inFlightFill,
      } = paramsRef.current;
      // Don't start a replace-refresh while an append, remainder page, or other
      // fetch is in flight — a page-1 refresh completing after the append would
      // wipe it, and overlapping window refreshes would race.
      if (isLoading || inFlightWindowRefresh || inFlightFill) {
        return;
      }
      if (isGrouped) {
        dispatch(
          quietFetchOverviewStatusAction.get({
            pageState: getGroupedFillPageState(ps),
            scopeStatusByLocation: scope,
            statusFilter: sf,
            silent: true,
            fillAll: true,
          })
        );
        return;
      }
      // The card view accumulates pages via infinite scroll. Refresh from page 1
      // with `perPage` clamped to the route max so a long session cannot 400.
      // Remainder pages (when loadedCount exceeds the max) are requested by
      // `refreshRemainingCardWindowEffect`.
      const refreshWholeWindow = currentView === 'cardView' && loadedCount > (ps.perPage ?? 0);
      const windowRefresh = refreshWholeWindow
        ? getCardWindowRefreshPayload(ps, loadedCount)
        : { pageState: ps };
      dispatch(
        quietFetchOverviewStatusAction.get({
          pageState: windowRefresh.pageState,
          scopeStatusByLocation: scope,
          statusFilter: sf,
          silent: true,
          refreshThrough: windowRefresh.refreshThrough,
        })
      );
    }
  }, [dispatch, lastRefresh]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevStatusFilterRef.current = statusFilter;
      if (hasUnsyncedUrlQuery) {
        return;
      }
    } else if (prevStatusFilterRef.current !== statusFilter) {
      prevStatusFilterRef.current = statusFilter;
      // When not already on page 1, reset it and let the resulting pageState
      // change re-run this effect to fetch the correct page — skipping the
      // stale-page fetch. When already on page 1 the reset is a Redux no-op, so
      // fall through and fetch with the new filter immediately.
      if (pageState.page !== 1) {
        dispatch(setOverviewPageStateAction({ page: 1 }));
        return;
      }
    }

    const { loaded: isLoaded } = paramsRef.current;
    const requestPageState = grouped ? getGroupedFillPageState(pageState) : pageState;
    if (isLoaded) {
      dispatch(
        quietFetchOverviewStatusAction.get({
          pageState: requestPageState,
          scopeStatusByLocation,
          statusFilter,
          ...(grouped ? { fillAll: true } : {}),
        })
      );
    } else {
      dispatch(
        fetchOverviewStatusAction.get({
          pageState: requestPageState,
          scopeStatusByLocation,
          statusFilter,
          ...(grouped ? { fillAll: true } : {}),
        })
      );
    }
  }, [dispatch, pageState, scopeStatusByLocation, hasUnsyncedUrlQuery, statusFilter, grouped]);

  return {
    status,
    error,
    loading,
    loaded,
    settled,
    allConfigs: allConfigs ?? [],
    total,
  };
}
