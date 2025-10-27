/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import '@kbn/react-query/mock';
import { useQueryClient } from '@kbn/react-query';
import {
  useGetMigrationTranslationStats,
  useInvalidateGetMigrationTranslationStats,
} from './use_get_migration_translation_stats';
import { getDashboardMigrationTranslationStats } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');

describe('Get Migration Translation Stats Hooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetMigrationTranslationStats', () => {
    it('returns translation stats', async () => {
      const mockStats = {
        id: '1',
        dashboards: {
          total: 10,
          success: {
            total: 5,
            result: {
              full: 2,
              partial: 3,
              untranslatable: 0,
            },
            installable: 5,
          },
          failed: 5,
        },
      };
      (getDashboardMigrationTranslationStats as jest.Mock).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useGetMigrationTranslationStats('1'), {
        wrapper: TestProviders,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API error');
      (getDashboardMigrationTranslationStats as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGetMigrationTranslationStats('1'), {
        wrapper: TestProviders,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useInvalidateGetMigrationTranslationStats', () => {
    const invalidateQueries = jest.fn();

    beforeEach(() => {
      (useQueryClient as jest.Mock).mockReturnValue({
        invalidateQueries,
      });
    });

    it('invalidates the query cache for a specific migration', () => {
      const { result } = renderHook(() => useInvalidateGetMigrationTranslationStats(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current('test-migration-1');
      });

      expect(invalidateQueries).toHaveBeenCalledWith(
        ['GET', '/internal/siem_migrations/dashboards/test-migration-1/translation_stats'],
        {
          refetchType: 'active',
        }
      );
    });
  });
});
