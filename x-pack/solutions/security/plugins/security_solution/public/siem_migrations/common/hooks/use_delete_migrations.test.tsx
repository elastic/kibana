/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useDeleteMigration } from './use_delete_migrations';
import { TestProviders } from '../../../common/mock';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockDeleteRuleMigration = jest.fn();
const mockDeleteDashboardMigration = jest.fn();

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess, addError: mockAddError }),
}));

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: {
          deleteMigration: mockDeleteRuleMigration,
        },
        dashboards: {
          deleteMigration: mockDeleteDashboardMigration,
        },
      },
    },
  }),
}));

describe('useDeleteMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteMigration for rules', async () => {
    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });
    act(() => {
      result.current.mutate('test-id');
    });

    await waitFor(() => {
      expect(mockDeleteRuleMigration).toHaveBeenCalledWith('test-id');
      expect(mockDeleteDashboardMigration).not.toHaveBeenCalled();
    });
  });

  it('calls deleteMigration for dashboards', async () => {
    const { result } = renderHook(() => useDeleteMigration('dashboard'), {
      wrapper: TestProviders,
    });
    act(() => {
      result.current.mutate('test-id');
    });

    await waitFor(() => {
      expect(mockDeleteDashboardMigration).toHaveBeenCalledWith('test-id');
      expect(mockDeleteRuleMigration).not.toHaveBeenCalled();
    });
  });

  it('calls addSuccess on success', async () => {
    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });
    act(() => {
      result.current.mutate('test-id');
    });

    await waitFor(() => {
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration deleted');
    });
  });

  it('calls addError on error', async () => {
    const error = new Error('test error');
    mockDeleteRuleMigration.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });

    result.current.mutate('test-id');
    await waitFor(() => result.current.isError);

    expect(mockAddError).toHaveBeenCalledWith(error, { title: 'Failed to delete migration' });
  });
});
