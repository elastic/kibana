/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  useUpdateSiemMigration,
  UPDATE_MIGRATION_SUCCESS,
  UPDATE_MIGRATION_FAILURE,
} from './use_update_siem_migration';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

// Toast mocks
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess, addError: mockAddError }),
}));

const createWrapper = () => {
  const client = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useUpdateSiemMigration', () => {
  const updateRuleMigrationApiMock = jest.fn();
  const updateDashboardMigrationMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: {
            api: {
              updateMigration: updateRuleMigrationApiMock,
            },
          },
          dashboards: {
            api: {
              updateDashboardMigration: updateDashboardMigrationMock,
            },
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rule', () => {
    it('updates rule migration successfully', async () => {
      updateRuleMigrationApiMock.mockResolvedValue(undefined);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSiemMigration('rule'), { wrapper });

      act(() => {
        result.current.mutate({ migrationId: 'rid', body: { name: 'New Name' } });
      });

      await waitFor(() => result.current.isSuccess || result.current.isError);

      expect(updateRuleMigrationApiMock).toHaveBeenCalledWith({
        migrationId: 'rid',
        body: { name: 'New Name' },
      });
      expect(mockAddSuccess).toHaveBeenCalledWith(UPDATE_MIGRATION_SUCCESS);
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles rule update error', async () => {
      const error = new Error('fail');
      updateRuleMigrationApiMock.mockRejectedValue(error);
      const onError = jest.fn();
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSiemMigration('rule', { onError }), { wrapper });

      act(() => {
        result.current.mutate({ migrationId: 'rid', body: { name: 'X' } });
      });

      await waitFor(() => result.current.isError || result.current.isSuccess);

      expect(mockAddError).toHaveBeenCalledWith(error, { title: UPDATE_MIGRATION_FAILURE });
      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.isError).toBe(true);
    });
  });

  describe('dashboard', () => {
    it('updates dashboard migration successfully', async () => {
      updateDashboardMigrationMock.mockResolvedValue(undefined);
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSiemMigration('dashboard'), { wrapper });

      act(() => {
        result.current.mutate({ migrationId: 'did', body: { name: 'Dash Name' } });
      });

      await waitFor(() => result.current.isSuccess || result.current.isError);

      expect(updateDashboardMigrationMock).toHaveBeenCalledWith({
        migrationId: 'did',
        body: { name: 'Dash Name' },
      });
      expect(mockAddSuccess).toHaveBeenCalledWith(UPDATE_MIGRATION_SUCCESS);
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles dashboard update error', async () => {
      const error = new Error('dash fail');
      updateDashboardMigrationMock.mockRejectedValue(error);
      const onError = jest.fn();
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSiemMigration('dashboard', { onError }), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ migrationId: 'did', body: { name: 'Dash' } });
      });

      await waitFor(() => result.current.isError || result.current.isSuccess);

      expect(mockAddError).toHaveBeenCalledWith(error, { title: UPDATE_MIGRATION_FAILURE });
      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.isError).toBe(true);
    });
  });
});
