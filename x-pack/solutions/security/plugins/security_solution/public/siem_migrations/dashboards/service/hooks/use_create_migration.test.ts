/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCreateMigration } from './use_create_migration';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { MigrationSource } from '../../../common/types';

jest.mock('../../../../common/lib/kibana/kibana_react');

const mockedUseKibana = useKibana as jest.Mock;
const mockCreateDashboardMigration = jest.fn();
const mockGetDashboardMigrationStats = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

describe('useCreateMigration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseKibana.mockReturnValue({
      services: {
        siemMigrations: {
          dashboards: {
            createDashboardMigration: mockCreateDashboardMigration,
            api: {
              getDashboardMigrationStats: mockGetDashboardMigrationStats,
            },
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

  describe('on success', () => {
    const onSuccess = jest.fn();
    const mockDashboards = [
      {
        result: {
          id: '1',
          title: 'dashboard 1',
          'eai:data': '<dashboard></dashboard>',
        },
      },
    ];
    const mockStats = { total: 1, translated: 1, not_translated: 0 };

    it('creates a migration, shows success toast, and calls onSuccess', async () => {
      mockCreateDashboardMigration.mockResolvedValue('mock-migration-id');
      mockGetDashboardMigrationStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        await result.current.createMigration('test-migration', mockDashboards);
      });

      expect(mockCreateDashboardMigration).toHaveBeenCalledWith(
        mockDashboards,
        'test-migration',
        MigrationSource.SPLUNK
      );
      expect(mockGetDashboardMigrationStats).toHaveBeenCalledWith({
        migrationId: 'mock-migration-id',
      });
      expect(mockAddSuccess).toHaveBeenCalledWith({
        title: 'Dashboard migration created successfully',
        text: '1 dashboards uploaded',
      });
      expect(onSuccess).toHaveBeenCalledWith(mockStats);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('on error', () => {
    it('shows an error toast when creation fails', async () => {
      const mockError = new Error('API error');
      mockCreateDashboardMigration.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateMigration());

      await act(async () => {
        await result.current.createMigration('test-migration', []);
      });

      expect(mockAddError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to upload dashboards file',
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });
});
