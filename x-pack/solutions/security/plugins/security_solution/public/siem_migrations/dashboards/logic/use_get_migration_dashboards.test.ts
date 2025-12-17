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
  useGetMigrationDashboards,
  useInvalidateGetMigrationDashboards,
} from './use_get_migration_dashboards';
import { migrationDashboards } from '../__mocks__';
import { getMigrationDashboards } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');

describe('Get Migration Dashboards Hooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetMigrationDashboards', () => {
    it('returns dashboards and total count', async () => {
      (getMigrationDashboards as jest.Mock).mockResolvedValue({
        data: migrationDashboards,
        total: 2,
      });

      const { result } = renderHook(
        () =>
          useGetMigrationDashboards({
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

      expect(result.current.data?.migrationDashboards).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API error');
      (getMigrationDashboards as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useGetMigrationDashboards({
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

  describe('useInvalidateGetMigrationDashboards', () => {
    const invalidateQueries = jest.fn();

    beforeEach(() => {
      (useQueryClient as jest.Mock).mockReturnValue({
        invalidateQueries,
      });
    });

    it('invalidates the query cache for a specific migration', () => {
      const { result } = renderHook(() => useInvalidateGetMigrationDashboards(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current('test-migration-1');
      });

      expect(invalidateQueries).toHaveBeenCalledWith(
        ['GET', '/internal/siem_migrations/dashboards/test-migration-1/dashboards'],
        {
          refetchType: 'active',
        }
      );
    });
  });
});
