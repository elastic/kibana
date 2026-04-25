/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useGetIntegrationsStats } from './use_get_integrations_stats';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;

describe('useGetIntegrationsStats', () => {
  const getIntegrationsStats = jest.fn();
  const addError = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            api: {
              getIntegrationsStats,
            },
          },
        },
        notifications: {
          toasts: {
            addError,
          },
        },
      },
    });
  });

  it('should call getIntegrationsStats and onSuccess on success', async () => {
    const stats = { total: 10 };
    getIntegrationsStats.mockResolvedValue(stats);

    const { result } = renderHook(() => useGetIntegrationsStats(onSuccess));

    await act(async () => {
      result.current.getIntegrationsStats();
    });

    expect(getIntegrationsStats).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(stats);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set error on failure', async () => {
    const error = new Error('Failed to get stats');
    getIntegrationsStats.mockRejectedValue(error);

    const { result } = renderHook(() => useGetIntegrationsStats(onSuccess));

    await act(async () => {
      result.current.getIntegrationsStats();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(error);
    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch integrations stats',
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
