/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import {
  useGetMigrationMissingPrivileges,
  useInvalidateGetMigrationPrivileges,
} from './use_get_migration_privileges';
import { getRuleMigrationMissingPrivileges } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');
jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));

describe('Get Migration Privileges Hooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetMigrationMissingPrivileges', () => {
    it('returns missing privileges', async () => {
      const mockResponse = {
        has_all_privileges: true,
        privileges: {
          all: [],
          read: [],
        },
      };
      (getRuleMigrationMissingPrivileges as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGetMigrationMissingPrivileges(), {
        wrapper: TestProviders,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API error');
      (getRuleMigrationMissingPrivileges as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGetMigrationMissingPrivileges(), {
        wrapper: TestProviders,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useInvalidateGetMigrationPrivileges', () => {
    const invalidateQueries = jest.fn();

    beforeEach(() => {
      (useQueryClient as jest.Mock).mockReturnValue({
        invalidateQueries,
      });
    });

    it('invalidates the query cache for privileges', () => {
      const { result } = renderHook(() => useInvalidateGetMigrationPrivileges(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current();
      });

      expect(invalidateQueries).toHaveBeenCalledWith(
        ['GET', '/internal/siem_migrations/rules/missing_privileges'],
        {
          refetchType: 'active',
        }
      );
    });
  });
});
