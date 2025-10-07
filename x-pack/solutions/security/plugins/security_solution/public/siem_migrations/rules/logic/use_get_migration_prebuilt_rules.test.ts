/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGetMigrationPrebuiltRules } from './use_get_migration_prebuilt_rules';
import { getRuleMigrationsPrebuiltRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');

describe('useGetMigrationPrebuiltRules', () => {
  it('returns prebuilt rules', async () => {
    const mockResponse = {
      rules: [
        {
          rule_id: '1',
          name: 'Prebuilt Rule 1',
        },
        {
          rule_id: '2',
          name: 'Prebuilt Rule 2',
        },
      ],
    };
    (getRuleMigrationsPrebuiltRules as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useGetMigrationPrebuiltRules('test-migration-1'), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  it('handles API errors gracefully', async () => {
    const mockError = new Error('API error');
    (getRuleMigrationsPrebuiltRules as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useGetMigrationPrebuiltRules('test-migration-1'), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });
});
