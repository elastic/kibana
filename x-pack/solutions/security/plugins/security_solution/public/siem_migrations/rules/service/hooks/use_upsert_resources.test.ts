/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useUpsertResources } from './use_upsert_resources';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { MigrationSource } from '../../../common/types';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;

describe('useUpsertResources', () => {
  const upsertMigrationResources = jest.fn();
  const addError = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            upsertMigrationResources,
          },
        },
        notifications: {
          toasts: {
            addError,
          },
        },
      },
    });
  });

  it('should call upsertResources and show success toast on success', async () => {
    upsertMigrationResources.mockResolvedValue({ success: true });
    const migrationId = 'test-migration';
    const data = [{ type: 'macro' as const, name: 'test', content: 'test' }];

    const { result } = renderHook(() => useUpsertResources(onSuccess));

    await act(async () => {
      result.current.upsertResources({ migrationId, vendor: MigrationSource.SPLUNK, data });
    });

    expect(upsertMigrationResources).toHaveBeenCalledWith({
      migrationId,
      vendor: MigrationSource.SPLUNK,
      body: data,
    });
    expect(onSuccess).toHaveBeenCalledWith(data);
    expect(result.current.isLoading).toBe(false);
  });

  it('should show error toast on failure', async () => {
    const error = new Error('Failed to upsert');
    upsertMigrationResources.mockRejectedValue(error);
    const migrationId = 'test-migration';
    const data = [{ type: 'macro' as const, name: 'test', content: 'test' }];

    const { result } = renderHook(() => useUpsertResources(onSuccess));

    await act(async () => {
      result.current.upsertResources({ migrationId, vendor: MigrationSource.SPLUNK, data });
    });

    expect(result.current.isLoading).toBe(false);
    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to upload rule migration resources',
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
