/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallMigrationRule } from './use_install_migration_rule';
import { installMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { migrationRules } from '../__mocks__';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useQueryClient } from '@kbn/react-query';

jest.mock('../api');
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addSuccess: jest.fn(),
    addError: jest.fn(),
  }),
}));
jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));
jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));

const mockResponse = { installed: 1 };
const mockError = new Error('API error');
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockReportTranslatedItemInstall = jest.fn();
const mockInvalidateQueries = jest.fn();

describe('useInstallMigrationRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    (useKibana as jest.Mock).mockReturnValue({
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
      (installMigrationRules as jest.Mock).mockResolvedValue(mockResponse);
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
      (installMigrationRules as jest.Mock).mockRejectedValue(mockError);
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
