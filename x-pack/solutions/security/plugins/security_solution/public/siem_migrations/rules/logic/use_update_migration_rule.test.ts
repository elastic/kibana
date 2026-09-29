/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateMigrationRule } from './use_update_migration_rule';
import { updateMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';
import { migrationRules } from '../__mocks__';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvalidateGetMigrationRules } from './use_get_migration_rules';
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

const mockResponse = { updated: 1 };
const mockError = new Error('API error');
const mockAddError = vi.fn();
const invalidateRules = vi.fn();
const invalidateStats = vi.fn();
const mockReportTranslatedItemUpdate = vi.fn();

describe('useUpdateMigrationRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addError: mockAddError,
    });
    (useInvalidateGetMigrationRules as Mock).mockReturnValue(invalidateRules);
    (useInvalidateGetMigrationTranslationStats as Mock).mockReturnValue(invalidateStats);
    (useKibana as Mock).mockReturnValue({
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
      (updateMigrationRules as Mock).mockResolvedValue(mockResponse);
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
      (updateMigrationRules as Mock).mockRejectedValue(mockError);
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
