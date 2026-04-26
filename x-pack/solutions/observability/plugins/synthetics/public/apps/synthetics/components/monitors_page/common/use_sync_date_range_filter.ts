/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOverviewPageState, setOverviewPageStateAction } from '../../../state';
import { fetchOverviewStatusAction } from '../../../state/overview_status';
import { useUrlParams } from '../../../hooks';

/**
 * Keep the date-range filter URL params in sync with `MonitorOverviewState`
 * and fire a "loud" refetch when the toggle (or the active date range) is
 * changed.
 *
 * This lives in its own hook — and not inside the display-options popover —
 * because the popover is rendered inside the grid, which early-returns
 * `<NoMonitorsFound />` when the list is empty. Once that happens the popover
 * unmounts, and any further URL-driven date-range changes (e.g. the user
 * widening the picker to recover from a narrow window with no summaries) are
 * never copied into `pageState` again. By placing the sync in a hook that
 * gets mounted higher in the tree (above the empty-state early return) the
 * URL stays the single source of truth regardless of the visible UI state.
 */
export function useSyncDateRangeFilter() {
  const dispatch = useDispatch();
  const [getUrlParams] = useUrlParams();
  const { filterByDateRange, dateRangeStart, dateRangeEnd } = getUrlParams();
  const pageState = useSelector(selectOverviewPageState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const isOn = Boolean(filterByDateRange);
    const next = {
      filterByDateRange: isOn,
      dateRangeStart,
      dateRangeEnd,
    };
    dispatch(setOverviewPageStateAction(next));

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only force a loud refetch when the toggle is/was active — otherwise the
    // legacy "all monitors" view doesn't change with the date range and a
    // loading flash would just be noise. The pageState debounce inside
    // `useOverviewStatus` will still pick up any subsequent state changes
    // automatically.
    const wasOn = Boolean(pageState.filterByDateRange);
    if (!isOn && !wasOn) {
      return;
    }
    dispatch(
      fetchOverviewStatusAction.get({
        pageState: { ...pageState, ...next },
        scopeStatusByLocation: true,
      })
    );
    // `pageState` is intentionally excluded — including it would re-trigger
    // the loud fetch every time we mutate it via the dispatch above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterByDateRange, dateRangeStart, dateRangeEnd]);
}
