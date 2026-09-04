/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useInvestigateAlert } from './use_investigate_alert';
import { useKibana } from '../utils/kibana_react';

jest.mock('../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const fetchMock = jest.fn();
const addSuccess = jest.fn();
const addDanger = jest.fn();

let queryClient: QueryClient;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const emptyList = { results: [], page: 1, size: 1, total: 0 };

const mockInvestigationsApi = ({
  list = emptyList,
  listAfterStart = { results: [{ status: 'pending' }], page: 1, size: 1, total: 1 },
}: {
  list?: unknown;
  listAfterStart?: unknown;
} = {}) => {
  let started = false;
  fetchMock.mockImplementation(async (endpoint: string) => {
    if (endpoint === 'GET /internal/nightshift/investigations/availability') {
      return { available: true };
    }
    if (endpoint === 'POST /internal/nightshift/investigations') {
      started = true;
      return { investigation_id: 'investigation-1' };
    }
    return started ? listAfterStart : list;
  });
};

const renderInvestigateAlert = () =>
  renderHook(() => useInvestigateAlert({ alertId: 'alert-1' }), { wrapper });

describe('useInvestigateAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { get: () => '' } },
        notifications: { toasts: { addSuccess, addDanger } },
        nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } },
      },
    });
    mockInvestigationsApi();
  });

  afterEach(() => queryClient.clear());

  it('returns Investigate when the alert has no investigation', async () => {
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));
    expect(result.current.investigateActionLabel).toBe('Investigate');
    expect(result.current.isInvestigating).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'GET /internal/nightshift/investigations',
      expect.objectContaining({
        params: {
          query: {
            concurrency_key: 'alert-1',
            sort_field: 'created_at',
            sort_order: 'desc',
            size: 1,
          },
        },
      })
    );
  });

  it('returns Investigating and disables starts for an ongoing investigation', async () => {
    mockInvestigationsApi({
      list: { results: [{ status: 'running' }], page: 1, size: 1, total: 1 },
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating'));
    expect(result.current.isInvestigating).toBe(true);
    await act(() => result.current.handleInvestigate());
    expect(fetchMock).not.toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations',
      expect.anything()
    );
  });

  it('returns Re-investigate after a completed investigation', async () => {
    mockInvestigationsApi({
      list: { results: [{ status: 'completed' }], page: 1, size: 1, total: 1 },
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Re-investigate'));
    expect(result.current.isInvestigating).toBe(false);
  });

  it('starts the investigation for the alert and marks it pending', async () => {
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(fetchMock).toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations',
      expect.objectContaining({
        params: {
          body: { subject: { type: 'alert', id: 'alert-1' }, concurrency_key: 'alert-1' },
        },
      })
    );
    expect(addSuccess).toHaveBeenCalledWith({ title: 'Investigation started' });
    expect(result.current.investigateActionLabel).toBe('Investigating');
    expect(result.current.isInvestigating).toBe(true);
  });

  it('reports start failures', async () => {
    fetchMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === 'POST /internal/nightshift/investigations') {
        throw new Error('Request failed');
      }
      return endpoint.endsWith('/availability') ? { available: true } : emptyList;
    });
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(addDanger).toHaveBeenCalledWith({
      title: 'Failed to start investigation',
      text: 'Request failed',
    });
  });

  it('hides the action when the nightshift plugin is unavailable', async () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { get: () => '' } },
        notifications: { toasts: { addSuccess, addDanger } },
      },
    });
    const { result } = renderInvestigateAlert();

    expect(result.current.showInvestigateAction).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
