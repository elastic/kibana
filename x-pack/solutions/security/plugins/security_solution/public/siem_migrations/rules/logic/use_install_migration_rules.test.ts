/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallMigrationRules } from './use_install_migration_rules';
import { installMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { MigrationSource } from '../../common/types';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';

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
vi.mock('./use_get_migration_rules', () => {
  const mocked = {
    useInvalidateGetMigrationRules: vi.fn(),
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
const invalidateRules = vi.fn();
const invalidateStats = vi.fn();
const mockReportTranslatedItemBulkInstall = vi.fn();
const defaultMigrationStats = {
  id: 'mig-1',
  name: 'test-migration',
  vendor: MigrationSource.SPLUNK,
  status: SiemMigrationTaskStatus.READY,
  items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('useInstallMigrationRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useInvalidateGetMigrationRules as Mock).mockReturnValue(invalidateRules);
    (useInvalidateGetMigrationTranslationStats as Mock).mockReturnValue(invalidateStats);
    (useKibana as Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
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
      (installMigrationRules as Mock).mockResolvedValue(mockResponse);
    });

    it('shows a success toast', async () => {
      const { result } = renderHook(() => useInstallMigrationRules(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'], enabled: true });

      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith('2 rules installed successfully.');
      });
    });

    it('invalidates queries on settled', async () => {
      const { result } = renderHook(() => useInstallMigrationRules(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'], enabled: true });

      await waitFor(() => {
        expect(invalidateRules).toHaveBeenCalledWith(defaultMigrationStats.id);
        expect(invalidateStats).toHaveBeenCalledWith(defaultMigrationStats.id);
      });
    });
  });

  describe('on error', () => {
    beforeEach(() => {
      (installMigrationRules as Mock).mockRejectedValue(mockError);
    });

    it('shows an error toast', async () => {
      const { result } = renderHook(() => useInstallMigrationRules(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'], enabled: true });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to install migration rules',
        });
      });
    });

    it('invalidates queries on settled', async () => {
      const { result } = renderHook(() => useInstallMigrationRules(defaultMigrationStats), {
        wrapper: TestProviders,
      });
      result.current.mutate({ ids: ['1', '2'], enabled: true });

      await waitFor(() => {
        expect(invalidateRules).toHaveBeenCalledWith(defaultMigrationStats.id);
        expect(invalidateStats).toHaveBeenCalledWith(defaultMigrationStats.id);
      });
    });
  });
});
