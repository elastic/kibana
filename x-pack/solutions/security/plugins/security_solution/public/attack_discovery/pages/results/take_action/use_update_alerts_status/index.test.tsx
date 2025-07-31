/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateAlertsStatus } from '.';

import * as updateAlertsModule from '../../../../../common/components/toolbar/bulk_actions/update_alerts';
import * as appToastsModule from '../../../../../common/hooks/use_app_toasts';

jest.mock('../../../../../common/components/toolbar/bulk_actions/update_alerts');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../use_find_attack_discoveries', () => ({
  useInvalidateFindAttackDiscoveries: () => jest.fn(),
}));
jest.mock('./translations', () => ({
  SUCCESSFULLY_MARKED_ALERTS: jest.fn(() => 'success'),
  UPDATED_ALERTS_WITH_VERSION_CONFLICTS: jest.fn(() => 'version conflict'),
  PARTIALLY_UPDATED_ALERTS: jest.fn(() => 'partial'),
  ERROR_UPDATING_ALERTS: 'error',
}));

describe('useUpdateAlertsStatus', () => {
  let addSuccess: jest.Mock;
  let addError: jest.Mock;
  let addWarning: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    addSuccess = jest.fn();
    addError = jest.fn();
    addWarning = jest.fn();
    jest.spyOn(appToastsModule, 'useAppToasts').mockReturnValue({
      addError,
      addSuccess,
      addWarning,
      addInfo: jest.fn(),
      remove: jest.fn(),
      api: {
        add: jest.fn(),
        addDanger: jest.fn(),
        addError: jest.fn(),
        addInfo: jest.fn(),
        addSuccess: jest.fn(),
        addWarning: jest.fn(),
        get$: jest.fn(),
        remove: jest.fn(),
      },
    });
    (updateAlertsModule.updateAlertStatus as jest.Mock).mockReset();
    queryClient = new QueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns a mutation that calls updateAlertStatus and addSuccess on full update', async () => {
    (updateAlertsModule.updateAlertStatus as jest.Mock).mockResolvedValue({
      updated: 2,
      version_conflicts: 0,
    });

    const { result } = renderHook(() => useUpdateAlertsStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: ['1', '2'], kibanaAlertWorkflowStatus: 'open' });
    });

    expect(addSuccess).toHaveBeenCalledWith('success');
  });

  it('returns a mutation that calls addWarning on version conflict', async () => {
    (updateAlertsModule.updateAlertStatus as jest.Mock).mockResolvedValue({
      updated: 1,
      version_conflicts: 1,
    });

    const { result } = renderHook(() => useUpdateAlertsStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: ['1', '2'], kibanaAlertWorkflowStatus: 'closed' });
    });

    expect(addWarning).toHaveBeenCalledWith('version conflict');
  });

  it('returns a mutation that calls addWarning on partial update with no version conflict', async () => {
    (updateAlertsModule.updateAlertStatus as jest.Mock).mockResolvedValue({
      updated: 1,
      version_conflicts: 0,
    });

    const { result } = renderHook(() => useUpdateAlertsStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: ['1', '2'], kibanaAlertWorkflowStatus: 'acknowledged' });
    });

    expect(addWarning).toHaveBeenCalledWith('partial');
  });

  it('returns a mutation that calls addError on error', async () => {
    (updateAlertsModule.updateAlertStatus as jest.Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useUpdateAlertsStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: ['1', '2'], kibanaAlertWorkflowStatus: 'open' });
    });

    expect(addError).toHaveBeenCalled();
  });
});
