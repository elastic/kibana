/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateMigrationRule } from './use_update_migration_rule';
import { updateMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { migrationRules } from '../__mocks__';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from './use_get_migration_translation_stats';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

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

const mockResponse = { updated: 1 };
const mockError = new Error('API error');
const mockAddError = jest.fn();
const invalidateRules = jest.fn();
const invalidateStats = jest.fn();
const mockReportTranslatedItemUpdate = jest.fn();

describe('useUpdateMigrationRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addError: mockAddError,
    });
    (useInvalidateGetMigrationRules as jest.Mock).mockReturnValue(invalidateRules);
    (useInvalidateGetMigrationTranslationStats as jest.Mock).mockReturnValue(invalidateStats);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            telemetry: {
              reportTranslatedItemUpdate: mockReportTranslatedItemUpdate,
            },
          },
        },
      },
    });
  });

  describe('on success', () => {
    beforeEach(() => {
      (updateMigrationRules as jest.Mock).mockResolvedValue(mockResponse);
    });

    it('invalidates queries on settled', async () => {
      const migrationRule = migrationRules[0];
      const { result } = renderHook(() => useUpdateMigrationRule(migrationRule), {
        wrapper: TestProviders,
      });
      result.current.mutate({
        ...migrationRule,
        elastic_rule: { ...migrationRule.elastic_rule, title: 'new name' },
      });

      await waitFor(() => {
        expect(invalidateRules).toHaveBeenCalledWith(migrationRule.migration_id);
        expect(invalidateStats).toHaveBeenCalledWith(migrationRule.migration_id);
      });
    });
  });

  describe('on error', () => {
    beforeEach(() => {
      (updateMigrationRules as jest.Mock).mockRejectedValue(mockError);
    });

    it('shows an error toast', async () => {
      const migrationRule = migrationRules[0];
      const { result } = renderHook(() => useUpdateMigrationRule(migrationRule), {
        wrapper: TestProviders,
      });
      result.current.mutate({
        ...migrationRule,
        elastic_rule: { ...migrationRule.elastic_rule, title: 'new name' },
      });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to update migration rules',
        });
      });
    });

    it('invalidates queries on settled', async () => {
      const migrationRule = migrationRules[0];
      const { result } = renderHook(() => useUpdateMigrationRule(migrationRule), {
        wrapper: TestProviders,
      });
      result.current.mutate({
        ...migrationRule,
        elastic_rule: { ...migrationRule.elastic_rule, title: 'new name' },
      });

      await waitFor(() => {
        expect(invalidateRules).toHaveBeenCalledWith(migrationRule.migration_id);
        expect(invalidateStats).toHaveBeenCalledWith(migrationRule.migration_id);
      });
    });
  });
});
