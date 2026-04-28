/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useDispatch } from 'react-redux';
import { WrappedHelper } from '../../../utils/testing';
import { setOverviewPageStateAction } from '../../../state';
import { fetchOverviewStatusAction } from '../../../state/overview_status';
import { useSyncDateRangeFilter } from './use_sync_date_range_filter';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

/**
 * These tests pin down the behaviour that the date-range filter sync hook
 * provides regardless of which component is currently mounted in the grid:
 * the `<NoMonitorsFound />` empty-state replaces the toolbar (and therefore
 * `<DisplayOptionsPopover />`), so any logic for translating URL params into
 * Redux state has to live higher up in the tree. Without this hook, widening
 * the date range from a window with no summaries back to one with monitors
 * silently kept the empty state on screen forever.
 */
describe('useSyncDateRangeFilter', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    dispatch.mockReset();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
  });

  /**
   * Build a wrapper backed by a memory history we control so we can drive URL
   * changes after the initial render with `history.push(...)`.
   */
  const renderForUrl = (url: string, state?: Parameters<typeof WrappedHelper>[0]['state']) => {
    const history = createMemoryHistory({ initialEntries: [url] });
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <WrappedHelper history={history} state={state}>
        {children as React.ReactElement}
      </WrappedHelper>
    );
    const result = renderHook(() => useSyncDateRangeFilter(), { wrapper });
    return { ...result, history };
  };

  const findCalls = (actionCreator: { type: string }) =>
    dispatch.mock.calls.filter(([action]) => action?.type === actionCreator.type);

  it('on initial mount syncs URL params into pageState without firing a loud fetch', () => {
    renderForUrl('/?filterByDateRange=true&dateRangeStart=now-15m&dateRangeEnd=now');

    expect(findCalls(setOverviewPageStateAction)).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledWith(
      setOverviewPageStateAction({
        filterByDateRange: true,
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
      })
    );
    // The initial mount should never trigger a loud fetch — `useOverviewStatus`
    // owns the first load, this hook only kicks in on subsequent changes.
    expect(findCalls(fetchOverviewStatusAction.get)).toHaveLength(0);
  });

  it('treats a missing filterByDateRange URL param as "off" and falls back to default range', () => {
    renderForUrl('/');

    expect(dispatch).toHaveBeenCalledWith(
      setOverviewPageStateAction({
        filterByDateRange: false,
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
      })
    );
    expect(findCalls(fetchOverviewStatusAction.get)).toHaveLength(0);
  });

  it('fires a loud fetch with the new range when the date picker widens an active filter', () => {
    // This is the regression scenario: the user is currently looking at a
    // narrow window with zero monitors (so the grid swaps in the empty state
    // and unmounts the popover). Widening the picker still has to refetch.
    const { history } = renderForUrl(
      '/?filterByDateRange=true&dateRangeStart=now-15m&dateRangeEnd=now',
      {
        overview: {
          pageState: {
            perPage: 10,
            sortOrder: 'asc',
            sortField: 'name.keyword',
            filterByDateRange: true,
            dateRangeStart: 'now-15m',
            dateRangeEnd: 'now',
          },
        },
      } as Parameters<typeof WrappedHelper>[0]['state']
    );

    dispatch.mockClear();

    act(() => {
      history.push('/?filterByDateRange=true&dateRangeStart=now-24h&dateRangeEnd=now');
    });

    expect(dispatch).toHaveBeenCalledWith(
      setOverviewPageStateAction({
        filterByDateRange: true,
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
      })
    );

    const fetchCalls = findCalls(fetchOverviewStatusAction.get);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0].payload).toEqual(
      expect.objectContaining({
        scopeStatusByLocation: true,
        pageState: expect.objectContaining({
          filterByDateRange: true,
          dateRangeStart: 'now-24h',
          dateRangeEnd: 'now',
        }),
      })
    );
  });

  it('skips the loud fetch when the toggle is and stays off, but still mirrors the URL into pageState', () => {
    const { history } = renderForUrl('/?dateRangeStart=now-15m&dateRangeEnd=now');
    dispatch.mockClear();

    act(() => {
      history.push('/?dateRangeStart=now-24h&dateRangeEnd=now');
    });

    expect(dispatch).toHaveBeenCalledWith(
      setOverviewPageStateAction({
        filterByDateRange: false,
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
      })
    );
    // No loud fetch — the legacy "all monitors" view doesn't depend on the
    // picker, so flashing the loading bar would just be noise.
    expect(findCalls(fetchOverviewStatusAction.get)).toHaveLength(0);
  });

  it('fires a loud fetch when the user toggles the filter off so the list widens back to the default window', () => {
    const { history } = renderForUrl(
      '/?filterByDateRange=true&dateRangeStart=now-15m&dateRangeEnd=now',
      {
        overview: {
          pageState: {
            perPage: 10,
            sortOrder: 'asc',
            sortField: 'name.keyword',
            filterByDateRange: true,
            dateRangeStart: 'now-15m',
            dateRangeEnd: 'now',
          },
        },
      } as Parameters<typeof WrappedHelper>[0]['state']
    );

    dispatch.mockClear();

    // Removing the URL flag is what `<DisplayOptionsPopover />` does when the
    // user flips the switch off.
    act(() => {
      history.push('/?dateRangeStart=now-15m&dateRangeEnd=now');
    });

    const fetchCalls = findCalls(fetchOverviewStatusAction.get);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0].payload.pageState).toEqual(
      expect.objectContaining({ filterByDateRange: false })
    );
  });
});
