/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

const mockResponse = { installed: 2 };
const mockError = new Error('API error');
const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const invalidateDashboards = vi.fn();
const invalidateStats = vi.fn();
const mockReportTranslatedItemBulkInstall = vi.fn();
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
              reportTranslatedItemBulkInstall: mockReportTranslatedItemBulkInstall,
            },
          },
        },
      },
    });
  });

  describe('on success', () => {
    beforeEach(() => {
      (installMigrationDashboards as Mock).mockResolvedValue(mockResponse);
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
      (installMigrationDashboards as Mock).mockRejectedValue(mockError);
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
