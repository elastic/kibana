/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLatestStats } from './use_latest_stats';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useLatestStats as useLatestStatsBase } from '../../../common/service';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../common/service', () => ({
  useLatestStats: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;
const useLatestStatsBaseMock = useLatestStatsBase as jest.Mock;

describe('useLatestStats', () => {
  const refreshStats = jest.fn();
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: {
          rules: {},
        },
        notifications: {
          toasts: {
            addError,
          },
        },
      },
    });
    useLatestStatsBaseMock.mockReturnValue({
      isLoading: false,
      data: [],
      refreshStats,
    });
  });

  it('should return the result from useLatestStatsBase', () => {
    const { result } = renderHook(() => useLatestStats());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(result.current.refreshStats).toBe(refreshStats);
  });
});
