/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallMigrationRule } from './use_install_migration_rule';
import { installMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { migrationRules } from '../__mocks__';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useQueryClient } from '@kbn/react-query';

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
vi.mock('../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/react-query', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/react-query')),
      useQueryClient: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockResponse = { installed: 1 };
const mockError = new Error('API error');
const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const mockReportTranslatedItemInstall = vi.fn();
const mockInvalidateQueries = vi.fn();

describe('useInstallMigrationRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useQueryClient as Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    (useKibana as Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
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
      (installMigrationRules as Mock).mockResolvedValue(mockResponse);
    });

    it('shows a success toast', async () => {
      const { result } = renderHook(() => useInstallMigrationRule('test-migration-1'), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationRule: migrationRules[0], enabled: true });

      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith('1 rule installed successfully.');
      });
    });

    it('invalidates queries on settled', async () => {
      const { result } = renderHook(() => useInstallMigrationRule('test-migration-1'), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationRule: migrationRules[0], enabled: true });

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith(
          ['GET', '/internal/siem_migrations/rules/test-migration-1/rules'],
          { refetchType: 'active' }
        );
        expect(mockInvalidateQueries).toHaveBeenCalledWith(
          ['GET', '/internal/siem_migrations/rules/test-migration-1/translation_stats'],
          { refetchType: 'active' }
        );
      });
    });
  });

  describe('on error', () => {
    beforeEach(() => {
      (installMigrationRules as Mock).mockRejectedValue(mockError);
    });

    it('shows an error toast', async () => {
      const { result } = renderHook(() => useInstallMigrationRule('test-migration-1'), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationRule: migrationRules[0], enabled: true });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to install migration rules',
        });
      });
    });

    it('invalidates queries on settled', async () => {
      const { result } = renderHook(() => useInstallMigrationRule('test-migration-1'), {
        wrapper: TestProviders,
      });
      result.current.mutate({ migrationRule: migrationRules[0], enabled: true });

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith(
          ['GET', '/internal/siem_migrations/rules/test-migration-1/rules'],
          { refetchType: 'active' }
        );
        expect(mockInvalidateQueries).toHaveBeenCalledWith(
          ['GET', '/internal/siem_migrations/rules/test-migration-1/translation_stats'],
          { refetchType: 'active' }
        );
      });
    });
  });
});
