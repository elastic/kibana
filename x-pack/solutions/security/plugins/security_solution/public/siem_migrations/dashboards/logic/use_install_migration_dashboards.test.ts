/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallMigrationDashboards } from './use_install_migration_dashboards';
import { installMigrationDashboards } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../common/types';

jest.mock('../api');
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addSuccess: jest.fn(),
    addError: jest.fn(),
  }),
}));
jest.mock('./use_get_migration_dashboards', () => ({
  useInvalidateGetMigrationDashboards: jest.fn(),
}));
jest.mock('./use_get_migration_translation_stats', () => ({
  useInvalidateGetMigrationTranslationStats: jest.fn(),
}));
jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const mockResponse = { installed: 2 };
const mockError = new Error('API error');
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const invalidateDashboards = jest.fn();
const invalidateStats = jest.fn();
const mockReportTranslatedItemBulkInstall = jest.fn();
const defaultMigrationStats = {
  id: '1',
  status: SiemMigrationTaskStatus.READY,
  vendor: MigrationSource.SPLUNK,
  name: 'Test Migration',
  items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('useInstallMigrationDashboards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useInvalidateGetMigrationDashboards as jest.Mock).mockReturnValue(invalidateDashboards);
    (useInvalidateGetMigrationTranslationStats as jest.Mock).mockReturnValue(invalidateStats);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          dashboards: {
            telemetry: {
              reportTranslatedItemBulkInstall: mockReportTranslatedItemBulkInstall,
            },
          },
        },
      },
    });
  });

  describe('on success', () => {
    beforeEach(() => {
      (installMigrationDashboards as jest.Mock).mockResolvedValue(mockResponse);
      const { result } = renderHook(() => useInstallMigrationDashboards(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'] });
    });

    it('shows a success toast', async () => {
      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith('2 dashboards installed successfully.');
      });
    });

    it('invalidates queries on settled', async () => {
      await waitFor(() => {
        expect(invalidateDashboards).toHaveBeenCalledWith('1');
        expect(invalidateStats).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('on error', () => {
    beforeEach(() => {
      (installMigrationDashboards as jest.Mock).mockRejectedValue(mockError);
      const { result } = renderHook(() => useInstallMigrationDashboards(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'] });
    });

    it('shows an error toast', async () => {
      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to install migration dashboards',
        });
      });
    });

    it('invalidates queries on settled', async () => {
      await waitFor(() => {
        expect(invalidateDashboards).toHaveBeenCalledWith('1');
        expect(invalidateStats).toHaveBeenCalledWith('1');
      });
    });
  });
});
