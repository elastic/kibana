/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStartMigration } from './use_start_migration';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

jest.mock('../../../common/lib/kibana/kibana_react');

describe('useStartMigration', () => {
  const mockStartRuleMigration = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            startRuleMigration: mockStartRuleMigration,
          },
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts a migration successfully', async () => {
    mockStartRuleMigration.mockResolvedValue({ started: true });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useStartMigration(onSuccess));

    act(() => {
      result.current.startMigration('test-migration-1');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockStartRuleMigration).toHaveBeenCalledWith('test-migration-1', undefined, undefined);
    expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    const mockError = new Error('API error');
    mockStartRuleMigration.mockRejectedValue(mockError);
    const { result } = renderHook(() => useStartMigration());

    act(() => {
      result.current.startMigration('test-migration-1');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddError).toHaveBeenCalledWith(mockError, {
      title: 'Error starting migration.',
    });
    expect(result.current.error).toBe(mockError);
  });
});
