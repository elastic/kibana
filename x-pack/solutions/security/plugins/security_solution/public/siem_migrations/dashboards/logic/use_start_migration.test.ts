/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useStartMigration } from './use_start_migration';
import { useKibana } from '../../../common/lib/kibana';
import { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';

jest.mock('../../../common/lib/kibana');

const mockedUseKibana = useKibana as jest.Mock;
const mockStartDashboardMigration = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

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
        await result.current.startMigration('1');
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith('1', undefined, undefined);
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('retries migration and shows success toast', async () => {
      mockStartDashboardMigration.mockResolvedValue({ started: true });

      const { result } = renderHook(() => useStartMigration(onSuccess));

      await act(async () => {
        await result.current.startMigration('1', SiemMigrationRetryFilter.FAILED);
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith('1', 'failed', undefined);
      expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('reprocesses migration and shows success toast', async () => {
      mockStartDashboardMigration.mockResolvedValue({ started: true });

      const { result } = renderHook(() => useStartMigration(onSuccess));

      await act(async () => {
        await result.current.startMigration('1', SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED);
      });

      expect(mockStartDashboardMigration).toHaveBeenCalledWith(
        '1',
        'not_fully_translated',
        undefined
      );
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
        await result.current.startMigration('1');
      });

      expect(mockAddError).toHaveBeenCalledWith(mockError, {
        title: 'Error starting migration.',
      });
    });
  });
});
