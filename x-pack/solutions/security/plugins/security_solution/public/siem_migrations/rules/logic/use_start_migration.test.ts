/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStartMigration } from './use_start_migration';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { RuleMigrationStats } from '../types';
import { MigrationSource } from '../../common/types';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';

jest.mock('../../../common/lib/kibana/kibana_react');

describe('useStartMigration', () => {
  const mockStartRuleMigration = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();
  const migrationStats: RuleMigrationStats = {
    id: 'test-migration-1',
    name: 'test-migration',
    vendor: MigrationSource.SPLUNK,
    status: SiemMigrationTaskStatus.READY,
    items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
    created_at: '2025-01-01T00:00:00Z',
    last_updated_at: '2025-01-01T01:00:00Z',
  };

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            startRuleMigration: mockStartRuleMigration,
          },
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts a migration successfully', async () => {
    mockStartRuleMigration.mockResolvedValue({ started: true });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useStartMigration(onSuccess));

    act(() => {
      result.current.startMigration(migrationStats);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockStartRuleMigration).toHaveBeenCalledWith({
      migrationId: migrationStats.id,
      vendor: migrationStats.vendor,
      retry: undefined,
      settings: undefined,
    });
    expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    const mockError = new Error('API error');
    mockStartRuleMigration.mockRejectedValue(mockError);
    const { result } = renderHook(() => useStartMigration());

    act(() => {
      result.current.startMigration(migrationStats);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddError).toHaveBeenCalledWith(mockError, {
      title: 'Error starting migration.',
    });
    expect(result.current.error).toBe(mockError);
  });
});
