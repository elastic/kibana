/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { renderHook, act } from '@testing-library/react';
import { useLatestStats } from './use_latest_stats';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react');

const mockUseKibana = useKibana as jest.Mock;

describe('useLatestStats', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        siemMigrations: {
          dashboards: {
            getLatestStats$: jest.fn().mockReturnValue(of(['test stats'])),
            startPolling: jest.fn(),
            getMigrationsStats: jest.fn(),
          },
        },
      },
    });
  });

  it('should fetch the latest stats', async () => {
    const { result } = renderHook(() => useLatestStats(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.refreshStats();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(['test stats']);
  });
});
