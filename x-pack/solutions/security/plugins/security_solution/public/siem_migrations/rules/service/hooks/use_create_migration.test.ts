/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCreateMigration } from './use_create_migration';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { CreateRuleMigrationRulesRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { MigrationSource } from '../../../common/types';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;

describe('useCreateMigration', () => {
  const createRuleMigration = jest.fn();
  const getRuleMigrationStats = jest.fn();
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const onSuccess = jest.fn();
  const rules: CreateRuleMigrationRulesRequestBody = [
    { id: 'test-rule' },
  ] as CreateRuleMigrationRulesRequestBody;

  beforeEach(() => {
    jest.clearAllMocks();
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
