/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useSetUnifiedAlertsWorkflowStatus } from './use_set_unified_alerts_workflow_status';
import { setUnifiedAlertsWorkflowStatus } from '../api';
import { useInvalidateSearchUnifiedAlerts } from './use_search_unified_alerts';
import { getUpdateByQueryResponseMock } from '../__mocks__';

vi.mock('../../../hooks/use_app_toasts');
vi.mock('../api');
vi.mock('./use_search_unified_alerts');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSetUnifiedAlertsWorkflowStatus', () => {
  const mockInvalidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: vi.fn(),
      addError: vi.fn(),
    });
    (useInvalidateSearchUnifiedAlerts as Mock).mockReturnValue(mockInvalidate);
  });

  it('should call setUnifiedAlertsWorkflowStatus and show success toast', async () => {
    const body = {
      signal_ids: ['alert-1', 'alert-2'],
      status: 'closed' as const,
    };
    const mockResponse = getUpdateByQueryResponseMock({ updated: 2 });
    (setUnifiedAlertsWorkflowStatus as Mock).mockResolvedValueOnce(mockResponse);

    const { addSuccess } = useAppToasts();
    const { result } = renderHook(() => useSetUnifiedAlertsWorkflowStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(body);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setUnifiedAlertsWorkflowStatus).toHaveBeenCalledWith({ body });
    expect(addSuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const body = {
      signal_ids: ['alert-1'],
      status: 'open' as const,
    };
    const error = new Error('Test error');
    (setUnifiedAlertsWorkflowStatus as Mock).mockRejectedValueOnce(error);

    const { addError } = useAppToasts();
    const { result } = renderHook(() => useSetUnifiedAlertsWorkflowStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(body);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(addError).toHaveBeenCalledWith(error, {
      title: expect.any(String),
    });
    expect(mockInvalidate).toHaveBeenCalled();
  });
});
