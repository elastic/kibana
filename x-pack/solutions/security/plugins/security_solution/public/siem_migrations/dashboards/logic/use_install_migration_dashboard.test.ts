/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useInstallMigrationDashboard } from './use_install_migration_dashboard';
import { installMigrationDashboards } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationDashboards } from './use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

vi.mock('../api');
vi.mock('../../../common/hooks/use_app_toasts', () => {
      const mocked = {
      useAppToasts: vi.fn().mockReturnValue({
        addSuccess: vi.fn(),
        addError: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_get_migration_dashboards', () => {
      const mocked = {
      useInvalidateGetMigrationDashboards: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_get_migration_translation_stats', () => {
      const mocked = {
      useInvalidateGetMigrationTranslationStats: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockResponse = { installed: 1 };
const mockError = new Error('API error');
const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const invalidateDashboards = vi.fn();
const invalidateStats = vi.fn();
const mockReportTranslatedItemInstall = vi.fn();

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
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useInvalidateGetMigrationDashboards as Mock).mockReturnValue(invalidateDashboards);
    (useInvalidateGetMigrationTranslationStats as Mock).mockReturnValue(invalidateStats);
    (useKibana as Mock).mockReturnValue({
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
      (installMigrationDashboards as Mock).mockResolvedValue(mockResponse);
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
      (installMigrationDashboards as Mock).mockRejectedValue(mockError);
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
