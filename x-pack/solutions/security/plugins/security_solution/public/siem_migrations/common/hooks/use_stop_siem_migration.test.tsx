/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useStopSiemMigration, STOP_SUCCESS, STOP_ERROR } from './use_stop_siem_migration';
import { MigrationSource } from '../types';

const mockStopRuleMigration = jest.fn();
const mockStopDashboardMigration = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess, addError: mockAddError }),
}));

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: { stopRuleMigration: mockStopRuleMigration },
        dashboards: { stopDashboardMigration: mockStopDashboardMigration },
      },
    },
  }),
}));

const createWrapper = () => {
  const client = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useStopSiemMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops a rule migration and shows success toast', async () => {
    mockStopRuleMigration.mockResolvedValue({ stopped: true });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStopSiemMigration('rule'), { wrapper });
    act(() => {
      result.current.mutate({ migrationId: 'some-migration-id', vendor: MigrationSource.SPLUNK });
    });
    await waitFor(() => result.current.isSuccess);
    expect(mockStopRuleMigration).toHaveBeenCalledWith({
      migrationId: 'some-migration-id',
      vendor: MigrationSource.SPLUNK,
    });
    expect(mockAddSuccess).toHaveBeenCalledWith(STOP_SUCCESS);
  });

  it('stops a dashboard migration and shows success toast', async () => {
    mockStopDashboardMigration.mockResolvedValue({ stopped: true });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStopSiemMigration('dashboard'), { wrapper });
    act(() => {
      result.current.mutate({ migrationId: 'did', vendor: MigrationSource.SPLUNK });
    });
    await waitFor(() => result.current.isSuccess);
    expect(mockStopDashboardMigration).toHaveBeenCalledWith({
      migrationId: 'did',
      vendor: MigrationSource.SPLUNK,
    });
    expect(mockAddSuccess).toHaveBeenCalledWith(STOP_SUCCESS);
  });

  it('handles stop error', async () => {
    const error = new Error('fail');
    mockStopRuleMigration.mockRejectedValue(error);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStopSiemMigration('rule'), { wrapper });
    act(() => {
      result.current.mutate({ migrationId: 'some-migration-id' });
    });
    await waitFor(() => result.current.isError);
    expect(mockAddError).toHaveBeenCalledWith(error, { title: STOP_ERROR });
  });
});
