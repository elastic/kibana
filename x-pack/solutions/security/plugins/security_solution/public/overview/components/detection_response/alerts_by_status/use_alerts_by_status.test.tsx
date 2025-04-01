/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { from, mockAlertsData, alertsByStatusQuery, parsedMockAlertsData, to } from './mock_data';
import type { UseAlertsByStatusProps } from './use_alerts_by_status';
import { useAlertsByStatus } from './use_alerts_by_status';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};
const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

// helper function to render the hook
const renderUseAlertsByStatus = (props: Partial<UseAlertsByStatusProps> = {}) =>
  renderHook(
    () =>
      useAlertsByStatus({
        queryId: 'test',
        signalIndexName: 'signal-alerts',
        from,
        to,
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('useAlertsByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseAlertsByStatus();

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });
    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsByStatusQuery,
      indexName: 'signal-alerts',
      skip: false,
      queryName: ALERTS_QUERY_NAMES.BY_STATUS,
    });
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseAlertsByStatus();

    expect(result.current).toEqual({
      items: parsedMockAlertsData,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseAlertsByStatus();

    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedMockAlertsData,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseAlertsByStatus({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsByStatusQuery,
      indexName: 'signal-alerts',
      skip: true,
      queryName: ALERTS_QUERY_NAMES.BY_STATUS,
    });

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });
  });
});
