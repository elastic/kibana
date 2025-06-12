/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useDebounce from 'react-use/lib/useDebounce';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { selectOverviewPageState } from '../../../state';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
} from '../../../state/overview_status';

export function useOverviewStatus({ scopeStatusByLocation }: { scopeStatusByLocation: boolean }) {
  const pageState = useSelector(selectOverviewPageState);
  const { status, error, loaded, loading, allConfigs } = useSelector(selectOverviewStatus);
  const isInitialMount = useRef(true);

  const { lastRefresh } = useSyntheticsRefreshContext();

  const dispatch = useDispatch();

  // Periodically refresh
  useEffect(() => {
    if (!isInitialMount.current) {
      dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
    }
    // specifically only want to run this on refreshInterval change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh]);

  // On initial mount, load the page
  useDebounce(
    () => {
      if (isInitialMount.current) {
        if (loaded) {
          dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
        } else {
          dispatch(fetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
        }
      }
    },
    100,
    // we don't use pageState or scopeStatus here, for pageState, useDebounce will handle it
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
      dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
    },
    100,
    [pageState, scopeStatusByLocation]
  );

  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
  };
}
