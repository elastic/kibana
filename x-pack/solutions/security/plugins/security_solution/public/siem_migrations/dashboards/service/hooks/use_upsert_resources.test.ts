/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useUpsertResources } from './use_upsert_resources';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react');

const mockedUseKibana = useKibana as jest.Mock;
const mockUpsertMigrationResources = jest.fn();
const mockAddError = jest.fn();

describe('useUpsertResources', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseKibana.mockReturnValue({
      services: {
        siemMigrations: {
          dashboards: {
            upsertMigrationResources: mockUpsertMigrationResources,
          },
        },
        notifications: {
          toasts: {
            addError: mockAddError,
          },
        },
      },
    });
  });

  describe('on success', () => {
    it('should upsert resources and call onSuccess', async () => {
      const mockResources = [{ name: 'resource1', type: 'macro' as const, content: 'test' }];
      mockUpsertMigrationResources.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpsertResources(mockOnSuccess));

      await act(async () => {
        await result.current.upsertResources('migration-id', mockResources);
      });

      expect(mockUpsertMigrationResources).toHaveBeenCalledWith('migration-id', mockResources);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('on error', () => {
    it('shows an error toast when upsert fails', async () => {
      const mockError = new Error('API error');
      mockUpsertMigrationResources.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpsertResources(mockOnSuccess));

      await act(async () => {
        await result.current.upsertResources('migration-id', []);
      });

      expect(mockAddError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to upload dashboard migration resources',
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });
});
