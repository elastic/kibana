/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useGetIntegrations } from './use_get_integrations';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;

describe('useGetIntegrations', () => {
  const getIntegrations = jest.fn();
  const addError = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            api: {
              getIntegrations,
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

  it('should call getIntegrations and onSuccess on success', async () => {
    const integrations = [{ name: 'test-integration' }];
    getIntegrations.mockResolvedValue(integrations);

    const { result } = renderHook(() => useGetIntegrations(onSuccess));

    await act(async () => {
      result.current.getIntegrations();
    });

    expect(getIntegrations).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(integrations);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set error on failure', async () => {
    const error = new Error('Failed to get integrations');
    getIntegrations.mockRejectedValue(error);

    const { result } = renderHook(() => useGetIntegrations(onSuccess));

    await act(async () => {
      result.current.getIntegrations();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(error);
    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch integrations',
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
