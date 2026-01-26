/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useStartMigration } from './use_start_migration';
import { useKibana } from '../../../common/lib/kibana';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../common/types';

jest.mock('../../../common/lib/kibana');

const mockedUseKibana = useKibana as jest.Mock;
const mockStartDashboardMigration = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const defaultMigrationStats = {
  id: '1',
  status: SiemMigrationTaskStatus.READY,
  vendor: MigrationSource.SPLUNK,
  name: 'Test Migration',
  items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('useStartMigration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseKibana.mockReturnValue({
      services: {
        siemMigrations: {
          dashboards: {
            startDashboardMigration: mockStartDashboardMigration,
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

    it('starts migration and shows success toast', async () => {
      mockStartDashboardMigration.mockResolvedValue({ started: true });

      const { result } = renderHook(() => useStartMigration(onSuccess));

      await act(async () => {
        await result.current.startMigration(defaultMigrationStats);
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith({
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
        retry: undefined,
        settings: undefined,
      });
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('retries migration and shows success toast', async () => {
      mockStartDashboardMigration.mockResolvedValue({ started: true });

      const { result } = renderHook(() => useStartMigration(onSuccess));

      await act(async () => {
        await result.current.startMigration(defaultMigrationStats, SiemMigrationRetryFilter.FAILED);
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith({
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
        retry: 'failed',
        settings: undefined,
      });
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('reprocesses migration and shows success toast', async () => {
      mockStartDashboardMigration.mockResolvedValue({ started: true });

      const { result } = renderHook(() => useStartMigration(onSuccess));

      await act(async () => {
        await result.current.startMigration(
          defaultMigrationStats,
          SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED
        );
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith({
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
        retry: 'not_fully_translated',
        settings: undefined,
      });
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('on error', () => {
    it('shows an error toast', async () => {
      const mockError = new Error('API error');
      mockStartDashboardMigration.mockRejectedValue(mockError);

      const { result } = renderHook(() => useStartMigration());

      await act(async () => {
        await result.current.startMigration(defaultMigrationStats);
      });

      expect(mockAddError).toHaveBeenCalledWith(mockError, {
        title: 'Error starting migration.',
      });
    });
  });
});
