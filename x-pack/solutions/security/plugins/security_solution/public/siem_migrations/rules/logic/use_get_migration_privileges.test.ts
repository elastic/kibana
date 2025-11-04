/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGetMigrationMissingPrivileges } from './use_get_migration_privileges';
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
});
