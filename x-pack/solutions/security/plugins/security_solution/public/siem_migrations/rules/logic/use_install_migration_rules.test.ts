/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('../api');
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addSuccess: jest.fn(),
    addError: jest.fn(),
  }),
}));
jest.mock('./use_get_migration_rules', () => ({
  useInvalidateGetMigrationRules: jest.fn(),
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
const invalidateRules = jest.fn();
const invalidateStats = jest.fn();
const mockReportTranslatedItemBulkInstall = jest.fn();
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
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useInvalidateGetMigrationRules as jest.Mock).mockReturnValue(invalidateRules);
    (useInvalidateGetMigrationTranslationStats as jest.Mock).mockReturnValue(invalidateStats);
    (useKibana as jest.Mock).mockReturnValue({
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
      (installMigrationRules as jest.Mock).mockResolvedValue(mockResponse);
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
      (installMigrationRules as jest.Mock).mockRejectedValue(mockError);
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
