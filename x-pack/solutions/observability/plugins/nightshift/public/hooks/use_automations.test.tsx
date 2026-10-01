/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import {
  AUTOMATIONS_QUERY_KEY,
  useAutomationsRunsInRange,
  useCreateAutomation,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
} from './use_automations';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();
const addSuccess = jest.fn();
const addError = jest.fn();

const renderWithClient = <T,>(hook: () => T) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper }), invalidateQueries };
};

describe('use_automations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addError, addSuccess } },
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('lists automations', async () => {
    investigationsFetch.mockResolvedValue({ automations: [], total: 0 });
    const { result } = renderWithClient(() => useFetchAutomations());

    await waitFor(() => expect(result.current.data).toEqual({ automations: [], total: 0 }));
    expect(investigationsFetch).toHaveBeenCalledWith('GET /internal/nightshift/automations', {
      signal: expect.anything(),
    });
  });

  it('loads runs for every automation in the range', async () => {
    investigationsFetch.mockImplementation((_endpoint, { params }) =>
      Promise.resolve({ runs: [], total: params.path.id === 'a' ? 3 : 1 })
    );
    const { result } = renderWithClient(() =>
      useAutomationsRunsInRange(['a', 'b'], '2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z')
    );

    await waitFor(() => expect(result.current.map(({ data }) => data?.total)).toEqual([3, 1]));
    expect(investigationsFetch).toHaveBeenCalledWith(
      'GET /internal/nightshift/automations/{id}/runs',
      {
        params: {
          path: { id: 'a' },
          query: {
            page: 1,
            size: 100,
            startedAfter: '2026-10-01T00:00:00.000Z',
            startedBefore: '2026-10-02T00:00:00.000Z',
          },
        },
        signal: null,
      }
    );
  });

  it('creates an automation, shows a toast, and refreshes the list', async () => {
    investigationsFetch.mockResolvedValue({ id: 'automation-1' });
    const { result, invalidateQueries } = renderWithClient(() => useCreateAutomation());
    const body = {
      name: 'Triage',
      trigger: { rows: [{ kind: 'alert' as const }] },
      execution: {},
      completion: {},
      runtime: {},
    };

    act(() => result.current.mutate(body));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Automation "Triage" created' })
    );
    expect(investigationsFetch).toHaveBeenCalledWith('POST /internal/nightshift/automations', {
      params: { body },
      signal: null,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: AUTOMATIONS_QUERY_KEY });
  });

  it('toggles and deletes automations', async () => {
    investigationsFetch.mockResolvedValue({});
    const toggle = renderWithClient(() => useToggleAutomation());
    const remove = renderWithClient(() => useDeleteAutomation());

    act(() => toggle.result.current.mutate({ id: 'automation-1', isEnabled: false }));
    act(() => remove.result.current.mutate('automation-1'));

    await waitFor(() => expect(investigationsFetch).toHaveBeenCalledTimes(2));
    expect(investigationsFetch).toHaveBeenCalledWith('PUT /internal/nightshift/automations/{id}', {
      params: { path: { id: 'automation-1' }, body: { isEnabled: false } },
      signal: null,
    });
    expect(investigationsFetch).toHaveBeenCalledWith(
      'DELETE /internal/nightshift/automations/{id}',
      { params: { path: { id: 'automation-1' } }, signal: null }
    );
  });

  it('shows an error toast when a mutation fails', async () => {
    investigationsFetch.mockRejectedValue(new Error('boom'));
    const { result } = renderWithClient(() => useDeleteAutomation());

    act(() => result.current.mutate('automation-1'));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Failed to delete automation',
      })
    );
  });
});
