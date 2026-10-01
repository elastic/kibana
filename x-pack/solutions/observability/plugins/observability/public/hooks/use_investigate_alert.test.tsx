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
import type {
  NightshiftInvestigationsRepositoryClient,
  InvestigationLocator,
} from '@kbn/nightshift-investigations-plugin/public';
import { useInvestigateAlert, VIEWED_INVESTIGATIONS_STORAGE_KEY } from './use_investigate_alert';
import { useKibana } from '../utils/kibana_react';
import { setInvestigationsClient } from '../services/investigations_client';

jest.mock('../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const fetchMock = jest.fn();
const addSuccess = jest.fn();
const addDanger = jest.fn();
const mockLocator = {
  getRedirectUrl: jest.fn(({ investigationId }: { investigationId: string }) =>
    investigationId ? `/app/nightshift?investigationId=${investigationId}` : ''
  ),
} as unknown as InvestigationLocator;

let queryClient: QueryClient;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const emptyList = { results: [], page: 1, size: 2, total: 0 };

const mockInvestigationsApi = ({
  list = emptyList,
  listAfterStart = { results: [{ status: 'pending' }], page: 1, size: 2, total: 1 },
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

const renderInvestigateAlert = (alertId = 'alert-1') =>
  renderHook(() => useInvestigateAlert({ alertId, ebtElement: 'testElement' }), { wrapper });

describe('useInvestigateAlert', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { get: () => '' } },
        share: {
          url: {
            locators: {
              get: jest.fn(() => mockLocator),
            },
          },
        },
        notifications: { toasts: { addSuccess, addDanger } },
      },
    });
    setInvestigationsClient({
      fetch: fetchMock,
    } as unknown as NightshiftInvestigationsRepositoryClient);
    mockInvestigationsApi();
  });

  afterEach(() => {
    window.localStorage.clear();
    queryClient.clear();
  });

  it('returns Investigate when the alert has no investigation', async () => {
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    expect(result.current.showViewInvestigation).toBe(false);
    expect(result.current.investigateActionLabel).toBe('Investigate');
    expect(result.current.investigateEbtProps).toEqual({
      'data-ebt-action': 'startInvestigation',
      'data-ebt-element': 'testElement',
    });
    expect(result.current.isInvestigating).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'GET /internal/nightshift/investigations',
      expect.objectContaining({
        params: {
          query: {
            concurrency_key: 'alert-1',
            statuses: ['pending', 'running', 'completed', 'failed', 'cancelled'],
            subject_types: ['alert'],
            sort_field: 'created_at',
            sort_order: 'desc',
            size: 1,
          },
        },
      })
    );
  });

  it('hides Investigate until the alert investigation status has loaded', async () => {
    fetchMock.mockImplementation((endpoint: string) =>
      endpoint === 'GET /internal/nightshift/investigations/availability'
        ? Promise.resolve({ available: true })
        : new Promise(() => {})
    );
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));
    expect(result.current.showInvestigateButton).toBe(false);
  });

  it('returns Investigating and disables starts for an ongoing running investigation', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-running', status: 'running' }],
        page: 1,
        size: 1,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.showInvestigateButton).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
    await act(() => result.current.handleInvestigate());
    expect(fetchMock).not.toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations',
      expect.anything()
    );
  });

  it('returns Investigating and hides view investigation for a pending investigation', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-pending', status: 'pending' }],
        page: 1,
        size: 1,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.showInvestigateButton).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
  });

  it('returns View investigation only for an unviewed completed investigation', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-completed', status: 'completed' }],
        page: 1,
        size: 2,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert('alert/1');

    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));
    expect(result.current.showInvestigateButton).toBe(false);
    expect(result.current.isInvestigating).toBe(false);
    expect(result.current.viewInvestigationActionLabel).toBe('View investigation');
    expect(result.current.viewInvestigationUrl).toBe(
      '/app/nightshift?investigationId=inv-completed'
    );
    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
      investigationId: 'inv-completed',
    });
  });

  it('shows Re-investigate after marking completed investigation as viewed', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-completed', status: 'completed' }],
        page: 1,
        size: 2,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert('alert/1');

    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));
    expect(result.current.showInvestigateButton).toBe(false);

    act(() => {
      result.current.markInvestigationViewed();
    });

    expect(result.current.showViewInvestigation).toBe(true);
    expect(result.current.showInvestigateButton).toBe(true);
    expect(result.current.investigateActionLabel).toBe('Re-investigate');
    expect(result.current.investigateEbtProps).toEqual({
      'data-ebt-action': 'startInvestigation',
      'data-ebt-element': 'testElement',
      'data-ebt-detail': 'reinvestigation',
    });
    expect(result.current.viewInvestigationEbtProps).toEqual({
      'data-ebt-action': 'viewInvestigation',
      'data-ebt-element': 'testElement',
      'data-ebt-detail': 'completed',
    });
    expect(
      JSON.parse(window.localStorage.getItem(VIEWED_INVESTIGATIONS_STORAGE_KEY) || '[]')
    ).toEqual(['inv-completed']);
  });

  it('shows View investigation and Re-investigate immediately for a failed investigation', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-failed', status: 'failed' }],
        page: 1,
        size: 2,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert('alert/1');

    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));
    expect(result.current.showInvestigateButton).toBe(true);
    expect(result.current.isInvestigating).toBe(false);
    expect(result.current.investigateActionLabel).toBe('Re-investigate');
  });

  it('shows View investigation and Re-investigate immediately for a cancelled investigation', async () => {
    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'inv-cancelled', status: 'cancelled' }],
        page: 1,
        size: 2,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert('alert/1');

    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));
    expect(result.current.showInvestigateButton).toBe(true);
    expect(result.current.isInvestigating).toBe(false);
    expect(result.current.investigateActionLabel).toBe('Re-investigate');
  });

  it('caps viewed investigation ids at 200 and keeps the latest first', async () => {
    const existingIds = Array.from({ length: 200 }, (_, i) => `old-inv-${i}`);
    window.localStorage.setItem(VIEWED_INVESTIGATIONS_STORAGE_KEY, JSON.stringify(existingIds));

    mockInvestigationsApi({
      list: {
        results: [{ investigation_id: 'new-inv', status: 'completed' }],
        page: 1,
        size: 2,
        total: 1,
      },
    });
    const { result } = renderInvestigateAlert('alert-1');

    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));

    act(() => {
      result.current.markInvestigationViewed();
    });

    const stored: string[] = JSON.parse(
      window.localStorage.getItem(VIEWED_INVESTIGATIONS_STORAGE_KEY) || '[]'
    );
    expect(stored).toHaveLength(200);
    expect(stored[0]).toBe('new-inv');
    expect(stored[1]).toBe('old-inv-0');
    expect(stored).not.toContain('old-inv-199');
  });

  it('does not show view investigation while a newer investigation is active', async () => {
    mockInvestigationsApi({
      list: {
        results: [
          { investigation_id: 'inv-running', status: 'running' },
          { investigation_id: 'inv-completed', status: 'completed' },
        ],
        page: 1,
        size: 2,
        total: 2,
      },
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.showViewInvestigation).toBe(false);
    expect(result.current.showInvestigateButton).toBe(false);
  });

  it('returns the completed investigation link without write availability', async () => {
    fetchMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === 'GET /internal/nightshift/investigations/availability') {
        throw new Error('Forbidden');
      }
      return {
        results: [{ investigation_id: 'inv-completed', status: 'completed' }],
        page: 1,
        size: 2,
        total: 1,
      };
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() =>
      expect(result.current.viewInvestigationUrl).toBe(
        '/app/nightshift?investigationId=inv-completed'
      )
    );
    expect(result.current.showInvestigateAction).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
  });

  it('starts the investigation for the alert and marks it pending', async () => {
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(fetchMock).toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations',
      expect.objectContaining({
        params: {
          body: { subject: { type: 'alert', id: 'alert-1' } },
        },
      })
    );
    expect(addSuccess).toHaveBeenCalledWith({ title: 'Investigation started' });
    expect(result.current.investigateActionLabel).toBe('Investigating…');
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

  it('does not fetch alert investigations when enabled is false', async () => {
    renderHook(
      () => useInvestigateAlert({ alertId: 'alert-1', ebtElement: 'testElement', enabled: false }),
      { wrapper }
    );

    expect(fetchMock).not.toHaveBeenCalledWith(
      'GET /internal/nightshift/investigations',
      expect.anything()
    );
  });

  it('hides the action when the nightshift plugin is unavailable', async () => {
    setInvestigationsClient(undefined);
    const { result } = renderInvestigateAlert();

    expect(result.current.showInvestigateAction).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
