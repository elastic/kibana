/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import dateMath from '@elastic/datemath';
import type { Moment } from 'moment';
import { useAttacksVolumeData } from './use_attacks_volume_data';
import { useAttackIds } from './use_attack_ids';
import { useAttackTimestamps } from './use_attack_timestamps';
import { parseAttacksVolumeData } from './helpers';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';

jest.mock('./use_attack_ids', () => ({
  useAttackIds: jest.fn(),
}));

jest.mock('./use_attack_timestamps', () => ({
  useAttackTimestamps: jest.fn(),
}));

jest.mock('./helpers', () => ({
  parseAttacksVolumeData: jest.fn(),
  getInterval: jest.fn(() => 3600000), // Mock returning 1 hour by default
}));

jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(),
}));

describe('useAttacksVolumeData', () => {
  const mockRefetchAgg = jest.fn();
  const mockRefetchDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: 'now-15m',
      to: 'now',
    });
    // Mock dateMath parsing
    jest.spyOn(dateMath, 'parse').mockImplementation((val) => {
      if (val === 'now-15m') return { valueOf: () => 1000 } as unknown as Moment;
      if (val === 'now') return { valueOf: () => 2000 } as unknown as Moment;
      return undefined;
    });
  });

  it('orchestrates fetching and parsing of data', () => {
    (useAttackIds as jest.Mock).mockReturnValue({
      attackIds: ['1', '2'],
      isLoading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as jest.Mock).mockReturnValue({
      attackStartTimes: { '1': 1500, '2': 1600 },
      isLoading: false,
      refetch: mockRefetchDetails,
    });
    (parseAttacksVolumeData as jest.Mock).mockReturnValue([{ x: 1, y: 1 }]);

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
    (useAttackIds as jest.Mock).mockReturnValue({
      attackIds: [],
      isLoading: true,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as jest.Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: false,
      refetch: mockRefetchDetails,
    });

    const { result } = renderHook(() => useAttacksVolumeData({}));
    expect(result.current.isLoading).toBe(true);
  });

  it('indicates loading when details query is loading and attack IDs exist', () => {
    (useAttackIds as jest.Mock).mockReturnValue({
      attackIds: ['1'],
      isLoading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as jest.Mock).mockReturnValue({
      attackStartTimes: {},
      isLoading: true,
      refetch: mockRefetchDetails,
    });

    const { result } = renderHook(() => useAttacksVolumeData({}));
    expect(result.current.isLoading).toBe(true);
  });

  it('calls both refetch functions when refetch is called', () => {
    (useAttackIds as jest.Mock).mockReturnValue({
      attackIds: [],
      isLoading: false,
      refetch: mockRefetchAgg,
    });
    (useAttackTimestamps as jest.Mock).mockReturnValue({
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
