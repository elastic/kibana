/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStartSiemMigration, START_SUCCESS, START_ERROR } from './use_start_siem_migration';
import type { MigrationType } from '../../../../common/siem_migrations/types';

// Mock Kibana services
const mockStartRuleMigration = jest.fn();
const mockStartDashboardMigration = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess, addError: mockAddError }),
}));

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: { startRuleMigration: mockStartRuleMigration },
        dashboards: { startDashboardMigration: mockStartDashboardMigration },
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

describe('useStartSiemMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testHook = async (type: MigrationType) => {
    const wrapper = createWrapper();
    const { result, ...rest } = renderHook(() => useStartSiemMigration(type), { wrapper });
    try {
      await result.current.mutateAsync({ migrationId: 'mid', settings: { connectorId: 'c1' } });
    } catch (e) {
      // ignore
    }
    await waitFor(() => result.current.isSuccess || result.current.isError);
    return { result, waitFor, ...rest };
  };

  it('starts a rule migration and shows success toast', async () => {
    mockStartRuleMigration.mockResolvedValue({ started: true });
    const { result } = await testHook('rule');
    expect(mockStartRuleMigration).toHaveBeenCalledWith('mid', undefined, { connectorId: 'c1' });
    expect(mockAddSuccess).toHaveBeenCalledWith(START_SUCCESS);
    expect(result.current.isSuccess).toBe(true);
  });

  it('starts a dashboard migration and shows success toast', async () => {
    mockStartDashboardMigration.mockResolvedValue({ started: true });
    const { result } = await testHook('dashboard');
    expect(mockStartDashboardMigration).toHaveBeenCalledWith('mid', undefined, {
      connectorId: 'c1',
    });
    expect(mockAddSuccess).toHaveBeenCalledWith(START_SUCCESS);
    expect(result.current.isSuccess).toBe(true);
  });

  it('handles start error', async () => {
    const error = new Error('fail');
    mockStartRuleMigration.mockRejectedValue(error);
    const { result } = await testHook('rule');
    expect(mockAddError).toHaveBeenCalledWith(error, { title: START_ERROR });
    expect(result.current.isError).toBe(true);
  });
});
