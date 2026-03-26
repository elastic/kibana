/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInfiniteOverviewTrendsRequests } from './use_infinite_overview_trends_requests';
import { WrappedHelper } from '../../../utils/testing';
import type { OverviewStatusMetaData } from '../overview/types';
import * as reduxHooks from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('./use_overview_trends_requests', () => ({
  useOverviewTrendsRequests: jest.fn(),
}));

import { useOverviewTrendsRequests } from './use_overview_trends_requests';

const mockUseOverviewTrendsRequests = useOverviewTrendsRequests as jest.MockedFunction<
  typeof useOverviewTrendsRequests
>;

describe('useInfiniteOverviewTrendsRequests', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = jest.fn();

  const createMockMonitor = (configId: string, locationId: string) =>
    ({
      configId,
      locationId,
      name: `Monitor ${configId}`,
      schedule: '5',
    } as OverviewStatusMetaData);

  const createMockMonitors = (count: number): OverviewStatusMetaData[] => {
    const monitors: OverviewStatusMetaData[] = [];
    for (let i = 0; i < count; i++) {
      monitors.push(createMockMonitor(`monitor-${i}`, `location-${i % 3}`));
    }
    return monitors;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (reduxHooks.useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (reduxHooks.useSelector as jest.Mock).mockImplementation(mockUseSelector);
    mockUseSelector.mockReturnValue({});
  });

  it('should call useOverviewTrendsRequests with empty array when visibleIndices is null', () => {
    const monitorsSortedByStatus = createMockMonitors(10);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: null,
          numOfColumns: 3,
        }),
      { wrapper: WrappedHelper }
    );

    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith([]);
  });

  it('should slice monitors correctly based on visibleIndices and numOfColumns', () => {
    const monitorsSortedByStatus = createMockMonitors(30);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 1,
            endIndex: 3,
          },
          numOfColumns: 3,
        }),
      { wrapper: WrappedHelper }
    );

    // visibleStartIndex: 1, visibleEndIndex: 3, numOfColumns: 3
    // slice(1 * 3, (3 + 1) * 3) = slice(3, 12)
    // Should get monitors between indices 3-11 (9 monitors)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(monitorsSortedByStatus.slice(3, 12));
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledTimes(1);
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(9);
  });

  it('should handle visibleStartIndex of 0', () => {
    const monitorsSortedByStatus = createMockMonitors(20);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 0,
            endIndex: 2,
          },
          numOfColumns: 4,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(0 * 4, (2 + 1) * 4) = slice(0, 12)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(monitorsSortedByStatus.slice(0, 12));
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(12);
  });

  it('should handle single row visible (visibleStartIndex === visibleEndIndex)', () => {
    const monitorsSortedByStatus = createMockMonitors(15);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 2,
            endIndex: 2,
          },
          numOfColumns: 5,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(2 * 5, (2 + 1) * 5) = slice(10, 15)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(
      monitorsSortedByStatus.slice(10, 15)
    );
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(5);
  });

  it('should handle visibleEndIndex beyond available monitors', () => {
    const monitorsSortedByStatus = createMockMonitors(10);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 2,
            endIndex: 10,
          },
          numOfColumns: 2,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(2 * 2, (10 + 1) * 2) = slice(4, 22)
    // But only 10 monitors, so should get monitors from index 4 to 9 (6 monitors)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(monitorsSortedByStatus.slice(4, 22));
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(6);
  });

  it('should handle empty monitorsSortedByStatus array', () => {
    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus: [],
          sliceToFetch: {
            startIndex: 0,
            endIndex: 5,
          },
          numOfColumns: 3,
        }),
      { wrapper: WrappedHelper }
    );

    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith([]);
  });

  it('should handle numOfColumns = 1 correctly', () => {
    const monitorsSortedByStatus = createMockMonitors(10);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 3,
            endIndex: 5,
          },
          numOfColumns: 1,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(3 * 1, (5 + 1) * 1) = slice(3, 6)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(monitorsSortedByStatus.slice(3, 6));
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(3);
  });

  it('should handle large numOfColumns value', () => {
    const monitorsSortedByStatus = createMockMonitors(50);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 0,
            endIndex: 1,
          },
          numOfColumns: 10,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(0 * 10, (1 + 1) * 10) = slice(0, 20)
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith(monitorsSortedByStatus.slice(0, 20));
    expect(mockUseOverviewTrendsRequests.mock.calls[0][0]).toHaveLength(20);
  });

  it('should handle visibleStartIndex beyond array length', () => {
    const monitorsSortedByStatus = createMockMonitors(10);

    renderHook(
      () =>
        useInfiniteOverviewTrendsRequests({
          monitorsSortedByStatus,
          sliceToFetch: {
            startIndex: 20,
            endIndex: 25,
          },
          numOfColumns: 2,
        }),
      { wrapper: WrappedHelper }
    );

    // slice(20 * 2, (25 + 1) * 2) = slice(40, 52)
    // Beyond array, should return empty
    expect(mockUseOverviewTrendsRequests).toHaveBeenCalledWith([]);
  });
});
