/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useOverviewTrendsRequests } from './use_overview_trends_requests';
import { WrappedHelper } from '../../../utils/testing';
import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import * as reduxHooks from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe('useOverviewTrendsRequests', () => {
  const mockMonitor1 = {
    configId: 'monitor-1',
    locations: [{ id: 'us-east', label: 'US East', status: 'up' }],
    name: 'Monitor 1',
    schedule: '3',
  } as OverviewStatusMetaData;

  const mockMonitor2 = {
    configId: 'monitor-2',
    locations: [{ id: 'us-west', label: 'US West', status: 'up' }],
    name: 'Monitor 2',
    schedule: '5',
  } as OverviewStatusMetaData;

  const mockMonitor3 = {
    configId: 'monitor-3',
    locations: [{ id: 'eu-central', label: 'EU Central', status: 'up' }],
    name: 'Monitor 3',
    schedule: '10',
  } as OverviewStatusMetaData;

  const mockMonitor4 = {
    configId: 'monitor-4',
    locations: [{ id: 'us-east', label: 'US East', status: 'up' }],
    name: 'Monitor 4',
    schedule: '3',
  } as OverviewStatusMetaData;

  let mockDispatch: jest.Mock;
  let mockUseSelector: jest.SpyInstance;

  beforeEach(() => {
    mockDispatch = jest.fn();
    mockUseSelector = jest.spyOn(reduxHooks, 'useSelector');
    jest.spyOn(reduxHooks, 'useDispatch').mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: React.PropsWithChildren) => <WrappedHelper>{children}</WrappedHelper>;
  };

  it('should dispatch action for all visible monitors when trendData is empty', () => {
    const monitorsToFetchTrendsFor = [mockMonitor1, mockMonitor2, mockMonitor3, mockMonitor4];
    mockUseSelector.mockReturnValue({});

    renderHook(() => useOverviewTrendsRequests(monitorsToFetchTrendsFor), {
      wrapper: createWrapper(),
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'batchTrendStats',
        payload: expect.arrayContaining([
          { configId: 'monitor-1', locationIds: ['us-east'], schedule: '3' },
          { configId: 'monitor-2', locationIds: ['us-west'], schedule: '5' },
          { configId: 'monitor-3', locationIds: ['eu-central'], schedule: '10' },
          { configId: 'monitor-4', locationIds: ['us-east'], schedule: '3' },
        ]),
      })
    );
  });

  it('should not request monitors that already have trendData', () => {
    const monitorsToFetchTrendsFor = [mockMonitor1, mockMonitor2, mockMonitor3];
    const existingTrendData = {
      'monitor-1us-east': { configId: 'monitor-1', locationId: 'us-east', data: [] },
    };
    mockUseSelector.mockReturnValue(existingTrendData);

    renderHook(() => useOverviewTrendsRequests(monitorsToFetchTrendsFor), {
      wrapper: createWrapper(),
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'batchTrendStats',
        payload: expect.arrayContaining([
          { configId: 'monitor-2', locationIds: ['us-west'], schedule: '5' },
          { configId: 'monitor-3', locationIds: ['eu-central'], schedule: '10' },
        ]),
      })
    );
    expect(mockDispatch.mock.calls[0][0].payload).toHaveLength(2);
  });

  it('should not request monitors that are in loading state', () => {
    const monitorsToFetchTrendsFor = [mockMonitor1, mockMonitor2, mockMonitor3];
    const existingTrendData = {
      'monitor-1us-east': 'loading',
    };
    mockUseSelector.mockReturnValue(existingTrendData);

    renderHook(() => useOverviewTrendsRequests(monitorsToFetchTrendsFor), {
      wrapper: createWrapper(),
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'batchTrendStats',
        payload: expect.arrayContaining([
          { configId: 'monitor-2', locationIds: ['us-west'], schedule: '5' },
          { configId: 'monitor-3', locationIds: ['eu-central'], schedule: '10' },
        ]),
      })
    );
    expect(mockDispatch.mock.calls[0][0].payload).toHaveLength(2);
  });

  it('should not dispatch action when all visible monitors have trendData', () => {
    const monitorsToFetchTrendsFor = [mockMonitor1, mockMonitor2];
    const existingTrendData = {
      'monitor-1us-east': { configId: 'monitor-1', locationId: 'us-east', data: [] },
      'monitor-2us-west': { configId: 'monitor-2', locationId: 'us-west', data: [] },
    };
    mockUseSelector.mockReturnValue(existingTrendData);

    renderHook(() => useOverviewTrendsRequests(monitorsToFetchTrendsFor), {
      wrapper: createWrapper(),
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should handle empty monitors list', () => {
    const monitorsSortedByStatus: OverviewStatusMetaData[] = [];
    mockUseSelector.mockReturnValue({});

    renderHook(() => useOverviewTrendsRequests(monitorsSortedByStatus), {
      wrapper: createWrapper(),
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
