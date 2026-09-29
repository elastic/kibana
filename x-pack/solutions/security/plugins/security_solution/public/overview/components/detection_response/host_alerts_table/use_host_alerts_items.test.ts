/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import {
  mockQuery,
  mockVulnerableHostsBySeverityResult,
  parsedVulnerableHostsAlertsResult,
} from './mock_data';
import { useHostAlertsItems } from './use_host_alerts_items';

import type { UseHostAlertsItems, UseHostAlertsItemsProps } from './use_host_alerts_items';

const signalIndexName = 'signal-alerts';

const dateNow = new Date('2022-04-15T12:00:00.000Z').valueOf();
const mockDateNow = vi.fn().mockReturnValue(dateNow);
Date.now = vi.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};

const mockUseQueryAlerts = vi.fn().mockReturnValue(defaultUseQueryAlertsReturn);
vi.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';

const mockUseGlobalTime = vi
  .fn()
  .mockReturnValue({ from, to, setQuery: vi.fn(), deleteQuery: vi.fn() });
vi.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const renderUseHostAlertsItems = (overrides: Partial<UseHostAlertsItemsProps> = {}) =>
  renderHook<ReturnType<UseHostAlertsItems>, UseHostAlertsItemsProps>(() =>
    useHostAlertsItems({
      skip: false,
      signalIndexName,
      queryId: 'testing',
      ...overrides,
    })
  );

describe('useVulnerableHostsCounters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseHostAlertsItems();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 0,
      }),
    });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(mockQuery());
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockVulnerableHostsBySeverityResult,
    });

    const { result } = renderUseHostAlertsItems();

    expect(result.current).toEqual({
      items: parsedVulnerableHostsAlertsResult,
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 1,
      }),
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockVulnerableHostsBySeverityResult,
    });

    const { result } = renderUseHostAlertsItems();
    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedVulnerableHostsAlertsResult,
      isLoading: false,
      updatedAt: newDateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 1,
      }),
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseHostAlertsItems({ skip: true });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith({ ...mockQuery(), skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 0,
      }),
    });
  });
});
