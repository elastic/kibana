/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useInstallMigrationDashboard } from './use_install_migration_dashboard';
import { installMigrationDashboards } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

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

const mockResponse = { installed: 1 };
const mockError = new Error('API error');
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const invalidateDashboards = jest.fn();
const invalidateStats = jest.fn();
const mockReportTranslatedItemInstall = jest.fn();

const mockDashboard: DashboardMigrationDashboard = {
  id: 'dash-1',
  migration_id: 'mig-1',
  original_dashboard: {
    id: 'orig-1',
    vendor: 'splunk',
    title: 'Original Dashboard',
    description: 'desc',
    data: '{}',
    format: 'json',
  },
  elastic_dashboard: {
    title: 'Elastic Dashboard',
    description: 'Elastic desc',
    data: '{}',
  },
  comments: [],
  created_by: 'user1',
  '@timestamp': '2024-06-01T12:00:00Z',
  status: 'completed',
  translation_result: 'full',
};

describe('useInstallMigrationDashboard', () => {
  const migrationId = 'mig-1';

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
              reportTranslatedItemInstall: mockReportTranslatedItemInstall,
            },
          },
        },
      },
    });
  });

  describe('on success', () => {
    beforeEach(() => {
      (installMigrationDashboards as jest.Mock).mockResolvedValue(mockResponse);
      const { result } = renderHook(() => useInstallMigrationDashboard(migrationId), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationDashboard: mockDashboard });
    });

    it('shows a success toast', async () => {
      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith('1 dashboard installed successfully.');
      });
    });

    it('reports translated dashboard install telemetry', async () => {
      await waitFor(() => {
        expect(mockReportTranslatedItemInstall).toHaveBeenCalledWith({
          migrationItem: mockDashboard,
          enabled: true,
          error: undefined,
        });
      });
    });

    it('invalidates queries on settled', async () => {
      await waitFor(() => {
        expect(invalidateDashboards).toHaveBeenCalledWith(migrationId);
        expect(invalidateStats).toHaveBeenCalledWith(migrationId);
      });
    });
  });

  describe('on error', () => {
    beforeEach(() => {
      (installMigrationDashboards as jest.Mock).mockRejectedValue(mockError);
      const { result } = renderHook(() => useInstallMigrationDashboard(migrationId), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationDashboard: mockDashboard });
    });

    it('shows an error toast', async () => {
      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to install migration dashboards',
        });
      });
    });

    it('reports translated dashboard install telemetry with error', async () => {
      await waitFor(() => {
        expect(mockReportTranslatedItemInstall).toHaveBeenCalledWith({
          migrationItem: mockDashboard,
          enabled: true,
          error: mockError,
        });
      });
    });

    it('invalidates queries on settled', async () => {
      await waitFor(() => {
        expect(invalidateDashboards).toHaveBeenCalledWith(migrationId);
        expect(invalidateStats).toHaveBeenCalledWith(migrationId);
      });
    });
  });
});
