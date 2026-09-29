/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUpdateAlertsStatus } from '.';

import * as updateAlertsModule from '../../../../../common/components/toolbar/bulk_actions/update_alerts';
import * as appToastsModule from '../../../../../common/hooks/use_app_toasts';

vi.mock('../../../../../common/components/toolbar/bulk_actions/update_alerts');
vi.mock('../../../../../common/hooks/use_app_toasts');
vi.mock('../../../use_find_attack_discoveries', () => {
      const mocked = {
      useInvalidateFindAttackDiscoveries: () => vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./translations', () => {
      const mocked = {
      SUCCESSFULLY_MARKED_ALERTS: vi.fn(() => 'success'),
      UPDATED_ALERTS_WITH_VERSION_CONFLICTS: vi.fn(() => 'version conflict'),
      PARTIALLY_UPDATED_ALERTS: vi.fn(() => 'partial'),
      ERROR_UPDATING_ALERTS: 'error',
    };
      return { ...mocked, default: mocked };
    });

describe('useUpdateAlertsStatus', () => {
  let addSuccess: Mock;
  let addError: Mock;
  let addWarning: Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    addSuccess = vi.fn();
    addError = vi.fn();
    addWarning = vi.fn();
    vi.spyOn(appToastsModule, 'useAppToasts').mockReturnValue({
      addError,
      addSuccess,
      addWarning,
      addInfo: vi.fn(),
      remove: vi.fn(),
      api: {
        add: vi.fn(),
        addDanger: vi.fn(),
        addError: vi.fn(),
        addInfo: vi.fn(),
        addSuccess: vi.fn(),
        addWarning: vi.fn(),
        get$: vi.fn(),
        remove: vi.fn(),
      },
    });
    (updateAlertsModule.updateAlertStatus as Mock).mockReset();
    queryClient = new QueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns a mutation that calls updateAlertStatus and addSuccess on full update', async () => {
    (updateAlertsModule.updateAlertStatus as Mock).mockResolvedValue({
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
    (updateAlertsModule.updateAlertStatus as Mock).mockResolvedValue({
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
    (updateAlertsModule.updateAlertStatus as Mock).mockResolvedValue({
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
    (updateAlertsModule.updateAlertStatus as Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useUpdateAlertsStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: ['1', '2'], kibanaAlertWorkflowStatus: 'open' });
    });

    expect(addError).toHaveBeenCalled();
  });
});
