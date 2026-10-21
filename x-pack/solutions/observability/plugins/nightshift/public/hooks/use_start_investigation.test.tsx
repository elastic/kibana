/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from './use_fetch_investigations';
import { useKibana } from './use_kibana';
import { useStartInvestigation } from './use_start_investigation';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();
const addSuccess = jest.fn();
const addError = jest.fn();

const renderStartInvestigation = (onStarted?: () => void) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useStartInvestigation({ onStarted }), { wrapper });
  return { result, invalidateQueries };
};

describe('useStartInvestigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    investigationsFetch.mockResolvedValue({ investigation_id: 'investigation-1' });
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addError, addSuccess } },
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('starts a manual investigation and refreshes the investigations list', async () => {
    const onStarted = jest.fn();
    const { result, invalidateQueries } = renderStartInvestigation(onStarted);

    act(() => result.current.startInvestigation('Why is checkout slow?'));

    await waitFor(() => expect(onStarted).toHaveBeenCalled());

    expect(investigationsFetch).toHaveBeenCalledWith('POST /internal/nightshift/investigations', {
      params: { body: { subject: { type: 'manual' }, message: 'Why is checkout slow?' } },
      signal: null,
    });
    expect(addSuccess).toHaveBeenCalledWith({ title: 'Investigation started' });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY,
    });
    expect(addError).not.toHaveBeenCalled();
  });

  it('surfaces start failures as toast errors and keeps the panel open', async () => {
    investigationsFetch.mockRejectedValueOnce(new Error('start failed'));
    const onStarted = jest.fn();
    const { result } = renderStartInvestigation(onStarted);

    act(() => result.current.startInvestigation('Why is checkout slow?'));

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to start investigation',
    });
    expect(addSuccess).not.toHaveBeenCalled();
    expect(onStarted).not.toHaveBeenCalled();
  });
});
