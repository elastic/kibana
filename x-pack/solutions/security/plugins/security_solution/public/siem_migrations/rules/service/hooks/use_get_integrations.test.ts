/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useGetIntegrations } from './use_get_integrations';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

vi.mock('../../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;

describe('useGetIntegrations', () => {
  const getIntegrations = vi.fn();
  const addError = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
