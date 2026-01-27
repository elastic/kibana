/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import {
  useGetMigrationTranslationStats,
  useInvalidateGetMigrationTranslationStats,
} from './use_get_migration_translation_stats';
import { getRuleMigrationTranslationStats } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');
jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));

describe('Get Migration Translation Stats Hooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetMigrationTranslationStats', () => {
    it('returns translation stats', async () => {
      const mockResponse = {
        total: 10,
        translated: 5,
        not_translated: 5,
      };
      (getRuleMigrationTranslationStats as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGetMigrationTranslationStats('test-migration-1'), {
        wrapper: TestProviders,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API error');
      (getRuleMigrationTranslationStats as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGetMigrationTranslationStats('test-migration-1'), {
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

    it('invalidates the query cache for translation stats', () => {
      const { result } = renderHook(() => useInvalidateGetMigrationTranslationStats(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current('test-migration-1');
      });

      expect(invalidateQueries).toHaveBeenCalledWith(
        ['GET', '/internal/siem_migrations/rules/test-migration-1/translation_stats'],
        {
          refetchType: 'active',
        }
      );
    });
  });
});
