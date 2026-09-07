/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useDeleteMigration } from './use_delete_migrations';
import { TestProviders } from '../../../common/mock';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../types';

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
  const defaultMigrationStats = {
    id: 'test-id',
    status: SiemMigrationTaskStatus.READY,
    vendor: MigrationSource.SPLUNK,
    name: 'Test Migration',
    items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
    created_at: '2025-01-01T00:00:00Z',
    last_updated_at: '2025-01-01T01:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteMigration for rules', async () => {
    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });
    act(() => {
      result.current.mutate(defaultMigrationStats);
    });

    await waitFor(() => {
      expect(mockDeleteRuleMigration).toHaveBeenCalledWith({
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
      });
      expect(mockDeleteDashboardMigration).not.toHaveBeenCalled();
    });
  });

  it('calls deleteMigration for dashboards', async () => {
    const { result } = renderHook(() => useDeleteMigration('dashboard'), {
      wrapper: TestProviders,
    });
    act(() => {
      result.current.mutate(defaultMigrationStats);
    });

    await waitFor(() => {
      expect(mockDeleteDashboardMigration).toHaveBeenCalledWith({
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
      });
      expect(mockDeleteRuleMigration).not.toHaveBeenCalled();
    });
  });

  it('calls addSuccess on success', async () => {
    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });
    act(() => {
      result.current.mutate(defaultMigrationStats);
    });

    await waitFor(() => {
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration deleted');
    });
  });

  it('calls addError on error', async () => {
    const error = new Error('test error');
    mockDeleteRuleMigration.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteMigration('rule'), { wrapper: TestProviders });

    result.current.mutate(defaultMigrationStats);
    await waitFor(() => result.current.isError);

    expect(mockAddError).toHaveBeenCalledWith(error, { title: 'Failed to delete migration' });
  });
});
