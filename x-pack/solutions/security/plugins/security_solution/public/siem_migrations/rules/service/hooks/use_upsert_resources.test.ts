/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useUpsertResources } from './use_upsert_resources';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { MigrationSource } from '../../../common/types';

vi.mock('../../../../common/lib/kibana/kibana_react', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;

describe('useUpsertResources', () => {
  const upsertMigrationResources = vi.fn();
  const addError = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
