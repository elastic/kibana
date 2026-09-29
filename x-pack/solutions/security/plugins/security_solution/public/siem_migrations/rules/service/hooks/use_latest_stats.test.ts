/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useLatestStats } from './use_latest_stats';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useLatestStats as useLatestStatsBase } from '../../../common/service';

vi.mock('../../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/service', () => {
      const mocked = {
      useLatestStats: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;
const useLatestStatsBaseMock = useLatestStatsBase as Mock;

describe('useLatestStats', () => {
  const refreshStats = vi.fn();
  const addError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
