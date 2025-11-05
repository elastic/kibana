/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useGetMissingResources } from './use_get_missing_resources';

const mockGetMissingResourcesRule = jest.fn();
const mockGetMissingResourcesDashboard = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: {
          api: {
            getMissingResources: mockGetMissingResourcesRule,
          },
        },
        dashboards: {
          api: {
            getDashboardMigrationMissingResources: mockGetMissingResourcesDashboard,
          },
        },
      },
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
    },
  }),
}));

describe('useGetMissingResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches missing resources for rules and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    const missingResources = [{ id: '1', type: 'type', name: 'name' }];
    mockGetMissingResourcesRule.mockResolvedValue(missingResources);

    const { result } = renderHook(() => useGetMissingResources('rule', onSuccess));

    await act(async () => {
      result.current.getMissingResources('migration-1');
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetMissingResourcesRule).toHaveBeenCalledWith({ migrationId: 'migration-1' });
    expect(onSuccess).toHaveBeenCalledWith(missingResources);
  });

  it('fetches missing resources for dashboards and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    const missingResources = [{ id: '2', type: 'type', name: 'name' }];
    mockGetMissingResourcesDashboard.mockResolvedValue(missingResources);

    const { result } = renderHook(() => useGetMissingResources('dashboard', onSuccess));

    await act(async () => {
      result.current.getMissingResources('migration-2');
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetMissingResourcesDashboard).toHaveBeenCalledWith({ migrationId: 'migration-2' });
    expect(onSuccess).toHaveBeenCalledWith(missingResources);
  });

  it('handles errors when fetching missing resources', async () => {
    const onSuccess = jest.fn();
    const error = new Error('Failed to fetch');
    mockGetMissingResourcesRule.mockRejectedValue({ body: error });

    const { result } = renderHook(() => useGetMissingResources('rule', onSuccess));

    await act(async () => {
      result.current.getMissingResources('migration-1');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(error);
    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch missing macros & lookups',
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
