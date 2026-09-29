/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useCreateMigration } from './use_create_migration';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { CreateRuleMigrationRulesRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { MigrationSource } from '../../../common/types';

vi.mock('../../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;

describe('useCreateMigration', () => {
  const createRuleMigration = vi.fn();
  const getRuleMigrationStats = vi.fn();
  const addSuccess = vi.fn();
  const addError = vi.fn();
  const onSuccess = vi.fn();
  const rules: CreateRuleMigrationRulesRequestBody = [
    { id: 'test-rule' },
  ] as CreateRuleMigrationRulesRequestBody;

  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            createRuleMigration,
            api: {
              getRuleMigrationStats,
            },
          },
        },
        notifications: {
          toasts: {
            addSuccess,
            addError,
          },
        },
      },
    });
  });

  it('should call createRuleMigration and onSuccess on success', async () => {
    createRuleMigration.mockResolvedValue('migration-id');
    getRuleMigrationStats.mockResolvedValue({ id: 'migration-id', items: { total: 1 } });

    const { result } = renderHook(() => useCreateMigration(onSuccess));

    await act(async () => {
      await result.current.createMigration({
        rules,
        migrationName: 'test-migration',
        vendor: MigrationSource.SPLUNK,
      });
    });

    expect(createRuleMigration).toHaveBeenCalledWith({
      rules,
      migrationName: 'test-migration',
      vendor: MigrationSource.SPLUNK,
    });
    expect(getRuleMigrationStats).toHaveBeenCalledWith({ migrationId: 'migration-id' });
    expect(addSuccess).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ id: 'migration-id', items: { total: 1 } });
    expect(result.current.isLoading).toBe(false);
  });

  it('should call addError on failure', async () => {
    const error = new Error('Failed to create migration');
    createRuleMigration.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateMigration(onSuccess));

    await act(async () => {
      await result.current.createMigration({
        migrationName: 'test-migration',
        rules,
        vendor: MigrationSource.SPLUNK,
      });
    });

    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to upload rules file',
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
