/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { useRunQuotas } from '../run_quotas/use_significant_events_run_quotas';
import { RUN_QUOTAS_QUERY_KEY } from '../query_keys';
import { useKibana } from '../../hooks/use_kibana';
import {
  AUTOMATIONS_QUERY_KEY,
  useAutomationsRunsInRange,
  useAutomationRunActivity,
  useCreateAutomation,
  useDeleteAutomation,
  useFetchAutomations,
  useRefreshAutomations,
  useRunAutomation,
  useToggleAutomation,
} from './use_automations';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();
const quotaFetch = jest.fn();
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
        significantEvents: { significantEventsRepositoryClient: { fetch: quotaFetch } },
        notifications: { toasts: { addError, addSuccess } },
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('refreshes every automation query', () => {
    const { result, invalidateQueries } = renderWithClient(() => useRefreshAutomations());

    act(() => {
      result.current();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: AUTOMATIONS_QUERY_KEY });
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
      completions: [],
      runtime: {},
    };

    act(() => result.current.mutate(body));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Automation created', text: 'Triage' })
    );
    expect(investigationsFetch).toHaveBeenCalledWith('POST /internal/nightshift/automations', {
      params: { body },
      signal: null,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: AUTOMATIONS_QUERY_KEY });
  });

  it('requests a run without configuration overrides and refreshes run history', async () => {
    investigationsFetch.mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const { result, invalidateQueries } = renderWithClient(() => useRunAutomation());
    act(() => result.current.mutate({ id: 'automation-1', name: 'Triage' }));
    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Run requested', text: 'Triage' })
    );
    expect(investigationsFetch).toHaveBeenCalledWith(
      'POST /internal/nightshift/automations/{id}/run',
      {
        params: { path: { id: 'automation-1' } },
        signal: null,
      }
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: AUTOMATIONS_QUERY_KEY });
  });

  it('refreshes quotas after acceptance and polls later admission and daily reset while the menu is open', async () => {
    jest.useFakeTimers();
    try {
      let quotas: RunQuotasResponse = {
        enabled: true,
        investigationLimitsEnabled: true,
        canManage: true,
        limits: {
          detection: 0,
          investigation: 0,
          manual_investigation: 1,
          total_investigation: 0,
          ki_extraction: 0,
        },
        counts: {
          detection: 0,
          investigation: 0,
          manual_investigation: 0,
          total_investigation: 0,
          ki_extraction: 0,
        },
        window: {
          start: '2040-01-01T00:00:00.000Z',
          resetsAt: '2040-01-02T00:00:00.000Z',
          timezone: 'UTC',
        },
      };
      quotaFetch.mockImplementation(async () => quotas);
      investigationsFetch.mockResolvedValue({ workflowExecutionId: 'exec-1' });
      const { result, invalidateQueries } = renderWithClient(() => ({
        quota: useRunQuotas({ poll: true }),
        run: useRunAutomation(),
      }));
      await waitFor(() => expect(result.current.quota.data?.counts.manual_investigation).toBe(0));
      act(() => result.current.run.mutate({ id: 'automation-1', name: 'Triage' }));
      await waitFor(() => expect(result.current.run.isSuccess).toBe(true));
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: RUN_QUOTAS_QUERY_KEY });
      expect(result.current.quota.data?.counts.manual_investigation).toBe(0);

      quotas = { ...quotas, counts: { ...quotas.counts, manual_investigation: 1 } };
      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });
      await waitFor(() => expect(result.current.quota.data?.counts.manual_investigation).toBe(1));

      quotas = {
        ...quotas,
        counts: { ...quotas.counts, manual_investigation: 0 },
        window: {
          ...quotas.window,
          start: '2040-01-02T00:00:00.000Z',
          resetsAt: '2040-01-03T00:00:00.000Z',
        },
      };
      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });
      await waitFor(() => expect(result.current.quota.data?.counts.manual_investigation).toBe(0));
      expect(result.current.quota.data?.window.resetsAt).toBe('2040-01-03T00:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps an accepted run busy until polling observes completion, even before search refresh', async () => {
    jest.useFakeTimers();
    try {
      let completed = false;
      investigationsFetch.mockImplementation((endpoint, { params }) => {
        if (endpoint.startsWith('POST')) return Promise.resolve({ workflowExecutionId: 'exec-1' });
        const executionId = params.query.executionId;
        return Promise.resolve({
          isRunning: executionId === 'exec-1' && !completed,
          executionId: completed ? undefined : executionId,
        });
      });
      const { result } = renderWithClient(() => ({
        activity: useAutomationRunActivity({
          id: 'automation-1',
          isEnabled: true,
          trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
          runtime: {},
        }),
        run: useRunAutomation(),
      }));
      await waitFor(() => expect(result.current.activity.data?.isRunning).toBe(false));
      act(() => result.current.run.mutate({ id: 'automation-1', name: 'Triage' }));
      await waitFor(() => expect(result.current.run.isSuccess).toBe(true));
      expect(result.current.activity.data?.isRunning).toBe(true);
      completed = true;
      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });
      await waitFor(() => expect(result.current.activity.data?.isRunning).toBe(false));
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a rejected run without showing acceptance feedback', async () => {
    investigationsFetch.mockRejectedValue(new Error('Workflow is invalid'));
    const { result } = renderWithClient(() => useRunAutomation());
    act(() => result.current.mutate({ id: 'automation-1', name: 'Triage' }));
    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Failed to run automation',
      })
    );
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('toggles and deletes automations', async () => {
    investigationsFetch.mockResolvedValue({});
    const toggle = renderWithClient(() => useToggleAutomation());
    const remove = renderWithClient(() => useDeleteAutomation());

    act(() =>
      toggle.result.current.mutate({ id: 'automation-1', name: 'Triage', isEnabled: false })
    );
    act(() => remove.result.current.mutate({ id: 'automation-1', name: 'Triage' }));

    await waitFor(() => expect(investigationsFetch).toHaveBeenCalledTimes(2));
    expect(investigationsFetch).toHaveBeenCalledWith('PUT /internal/nightshift/automations/{id}', {
      params: { path: { id: 'automation-1' }, body: { isEnabled: false } },
      signal: null,
    });
    expect(investigationsFetch).toHaveBeenCalledWith(
      'DELETE /internal/nightshift/automations/{id}',
      { params: { path: { id: 'automation-1' } }, signal: null }
    );
    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Automation deleted', text: 'Triage' })
    );
  });

  it('shows an error toast when a mutation fails', async () => {
    investigationsFetch.mockRejectedValue(new Error('boom'));
    const { result } = renderWithClient(() => useDeleteAutomation());

    act(() => result.current.mutate({ id: 'automation-1', name: 'Triage' }));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Failed to delete automation',
      })
    );
  });
});
