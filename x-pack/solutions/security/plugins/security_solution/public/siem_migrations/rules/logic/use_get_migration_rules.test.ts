/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor, act } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import { useGetMigrationRules, useInvalidateGetMigrationRules } from './use_get_migration_rules';
import { migrationRules } from '../__mocks__';
import { getMigrationRules } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

vi.mock('../api');
vi.mock('@kbn/react-query', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/react-query')),
    useQueryClient: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('Get Migration Rules Hooks', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetMigrationRules', () => {
    it('returns rules and total count', async () => {
      (getMigrationRules as Mock).mockResolvedValue({
        data: migrationRules,
        total: 2,
      });

      const { result } = renderHook(
        () =>
          useGetMigrationRules({
            migrationId: '1',
            page: 0,
            perPage: 10,
            sortField: 'last_updated_at',
            sortDirection: 'desc',
            filters: {},
          }),
        { wrapper: TestProviders }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.migrationRules).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API error');
      (getMigrationRules as Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useGetMigrationRules({
            migrationId: '1',
            page: 0,
            perPage: 10,
            sortField: 'last_updated_at',
            sortDirection: 'desc',
            filters: {},
          }),
        { wrapper: TestProviders }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useInvalidateGetMigrationRules', () => {
    const invalidateQueries = vi.fn();

    beforeEach(() => {
      (useQueryClient as Mock).mockReturnValue({
        invalidateQueries,
      });
    });

    it('invalidates the query cache for a specific migration', () => {
      const { result } = renderHook(() => useInvalidateGetMigrationRules(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current('test-migration-1');
      });

      expect(invalidateQueries).toHaveBeenCalledWith(
        ['GET', '/internal/siem_migrations/rules/test-migration-1/rules'],
        {
          refetchType: 'active',
        }
      );
    });
  });
});
