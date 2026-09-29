/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import dateMath from '@elastic/datemath';
import type { Moment } from 'moment';
import type { Filter, Query } from '@kbn/es-query';
import { useAttacksVolumeData } from './use_attacks_volume_data';
import { useAlertsAggregation } from '../common/use_alerts_aggregation';
import { useAttackTimestamps } from './use_attack_timestamps';
import { parseAttacksVolumeData } from './helpers';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { buildAttacksOnlyFilter } from '../../table/filtering_configs';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';

vi.mock('../common/use_alerts_aggregation', () => {
      const mocked = {
      useAlertsAggregation: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_attack_timestamps', () => {
      const mocked = {
      useAttackTimestamps: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./helpers', () => {
      const mocked = {
      parseAttacksVolumeData: vi.fn(),
      getInterval: vi.fn(() => 3600000), // Mock returning 1 hour by default
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./aggregations', () => {
      const mocked = {
      getAttacksVolumeAggregations: vi.fn(() => ({ some: 'agg' })),
    };
      return { ...mocked, default: mocked };
    });

describe('useAttacksVolumeData', () => {
  const mockRefetchAgg = vi.fn();
  const mockRefetchDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGlobalTime as Mock).mockReturnValue({
      from: 'now-15m',
      to: 'now',
    });
    // Mock dateMath parsing
    vi.spyOn(dateMath, 'parse').mockImplementation((val) => {
      if (val === 'now-15m') return { valueOf: () => 1000 } as unknown as Moment;
      if (val === 'now') return { valueOf: () => 2000 } as unknown as Moment;
      return undefined;
    });
  });

  it('fetches aggregation data with correct parameters', () => {
    const mockFilters = [{ meta: {}, query: {} }] as Filter[];
    const mockQuery = { query: 'test' } as unknown as Query;

    (useAlertsAggregation as Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: vi.fn(),
    });
    (useAttackTimestamps as Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() => useAttacksVolumeData({ filters: mockFilters, query: mockQuery }));

    expect(useAlertsAggregation).toHaveBeenCalledWith({
      filters: [...mockFilters, ...buildAttacksOnlyFilter()],
      query: mockQuery,
      aggs: { some: 'agg' },
      queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      uniqueQueryId: 'attacks-kpi-attacks-volume',
    });
  });

  it('orchestrates fetching and parsing of data', () => {
    (useAlertsAggregation as Mock).mockReturnValue({
      data: {
        aggregations: {
          attacks: {
            buckets: [{ key: '1' }, { key: '2' }],
          },
        },
      },
      loading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as Mock).mockReturnValue({
      attackStartTimes: { '1': 1500, '2': 1600 },
      isLoading: false,
      refetch: mockRefetchDetails,
    });
    (parseAttacksVolumeData as Mock).mockReturnValue([{ x: 1, y: 1 }]);

    const { result } = renderHook(() => useAttacksVolumeData({}));

    expect(result.current.items).toEqual([{ x: 1, y: 1 }]);
    expect(result.current.isLoading).toBe(false);
    expect(parseAttacksVolumeData).toHaveBeenCalledWith(
      expect.objectContaining({
        attackStartTimes: { '1': 1500, '2': 1600 },
        intervalMs: 3600000, // Should be 1 hour for small range
      })
    );
  });

  it('indicates loading when aggregation query is loading', () => {
    (useAlertsAggregation as Mock).mockReturnValue({
      data: undefined,
      loading: true,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: false,
      refetch: mockRefetchDetails,
    });

    const { result } = renderHook(() => useAttacksVolumeData({}));
    expect(result.current.isLoading).toBe(true);
  });

  it('indicates loading when details query is loading and attack IDs exist', () => {
    (useAlertsAggregation as Mock).mockReturnValue({
      data: {
        aggregations: {
          attacks: {
            buckets: [{ key: '1' }],
          },
        },
      },
      loading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: true,
      refetch: mockRefetchDetails,
    });

    const { result } = renderHook(() => useAttacksVolumeData({}));
    expect(result.current.isLoading).toBe(true);
  });

  it('calls both refetch functions when refetch is called', () => {
    (useAlertsAggregation as Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: false,
      refetch: mockRefetchDetails,
    });

    const { result } = renderHook(() => useAttacksVolumeData({}));
    result.current.refetch();

    expect(mockRefetchAgg).toHaveBeenCalled();
    expect(mockRefetchDetails).toHaveBeenCalled();
  });
});
