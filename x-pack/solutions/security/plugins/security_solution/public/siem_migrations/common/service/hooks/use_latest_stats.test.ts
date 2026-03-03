/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLatestStats } from './use_latest_stats';
import { BehaviorSubject } from 'rxjs';
import type { SiemMigrationsServiceBase } from '../migrations_service_base';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';

describe('useLatestStats', () => {
  let mockMigrationService: jest.Mocked<SiemMigrationsServiceBase<MigrationTaskStats>>;
  let latestStats$: BehaviorSubject<MigrationTaskStats[] | null>;

  beforeEach(() => {
    latestStats$ = new BehaviorSubject<MigrationTaskStats[] | null>(null);
    mockMigrationService = {
      startPolling: jest.fn(),
      getMigrationsStats: jest.fn(),
      getLatestStats$: jest.fn().mockReturnValue(latestStats$),
    } as unknown as jest.Mocked<SiemMigrationsServiceBase<MigrationTaskStats>>;
  });

  it('starts polling on mount', () => {
    renderHook(() => useLatestStats(mockMigrationService));
    expect(mockMigrationService.startPolling).toHaveBeenCalledTimes(1);
  });

  it('returns isLoading true when latestStats is null', () => {
    const { result } = renderHook(() => useLatestStats(mockMigrationService));
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading false and data when latestStats has a value', () => {
    const stats: MigrationTaskStats[] = [
      {
        id: '1',
        name: 'test-stat',
        status: 'finished',
        items: {
          total: 1,
          pending: 0,
          processing: 0,
          completed: 1,
          failed: 0,
        },
        created_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      },
    ];
    const { result } = renderHook(() => useLatestStats(mockMigrationService));

    act(() => {
      latestStats$.next(stats);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(stats);
  });

  it('calls getMigrationsStats when refreshStats is called', () => {
    const { result } = renderHook(() => useLatestStats(mockMigrationService));

    act(() => {
      result.current.refreshStats();
    });

    expect(mockMigrationService.getMigrationsStats).toHaveBeenCalledTimes(1);
  });

  it('returns initial data as an empty array when latestStats is null', () => {
    const { result } = renderHook(() => useLatestStats(mockMigrationService));
    expect(result.current.data).toEqual([]);
  });
});
