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
import { useSetUnifiedAlertsTags } from './use_set_unified_alerts_tags';
import { setUnifiedAlertsTags } from '../api';
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

describe('useSetUnifiedAlertsTags', () => {
  const mockInvalidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: vi.fn(),
      addError: vi.fn(),
    });
    (useInvalidateSearchUnifiedAlerts as Mock).mockReturnValue(mockInvalidate);
  });

  it('should call setUnifiedAlertsTags and show success toast', async () => {
    const body = {
      tags: {
        tags_to_add: ['tag-1'],
        tags_to_remove: [],
      },
      ids: ['alert-1', 'alert-2'],
    };
    const mockResponse = getUpdateByQueryResponseMock({ updated: 2 });
    (setUnifiedAlertsTags as Mock).mockResolvedValueOnce(mockResponse);

    const { addSuccess } = useAppToasts();
    const { result } = renderHook(() => useSetUnifiedAlertsTags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(body);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setUnifiedAlertsTags).toHaveBeenCalledWith({ body });
    expect(addSuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const body = {
      tags: {
        tags_to_add: ['tag-1'],
        tags_to_remove: [],
      },
      ids: ['alert-1'],
    };
    const error = new Error('Test error');
    (setUnifiedAlertsTags as Mock).mockRejectedValueOnce(error);

    const { addError } = useAppToasts();
    const { result } = renderHook(() => useSetUnifiedAlertsTags(), {
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
