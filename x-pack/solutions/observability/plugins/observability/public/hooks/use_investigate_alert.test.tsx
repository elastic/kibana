/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import type { ToastInputFields } from '@kbn/core-notifications-browser';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type {
  NightshiftInvestigationsRepositoryClient,
  InvestigationLocator,
} from '@kbn/nightshift-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATIONS_INTERNAL_URL,
} from '@kbn/agentic-investigations-plugin/common';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_URL,
  useInvestigateAlert,
  VIEWED_INVESTIGATIONS_STORAGE_KEY,
} from './use_investigate_alert';
import { useKibana } from '../utils/kibana_react';
import { setInvestigationsClient } from '../services/investigations_client';

jest.mock('../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const fetchMock = jest.fn();
const httpGet = jest.fn();
const addSuccess = jest.fn<void, [ToastInputFields]>();
const addDanger = jest.fn();
const getLocator = jest.fn<InvestigationLocator | undefined, []>(() => mockLocator);
const mockLocator = {
  getRedirectUrl: jest.fn(({ investigationId }: { investigationId: string }) =>
    investigationId ? `/app/nightshift?investigationId=${investigationId}` : ''
  ),
} as unknown as InvestigationLocator;

let queryClient: QueryClient;
let unmountToasts: Array<() => void>;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const summary = (
  id: string,
  overrides: Partial<InvestigationSummary> = {}
): InvestigationSummary => ({
  id,
  title: id,
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open' },
  in_progress: false,
  subjects: [],
  ...overrides,
});

const list = (...results: InvestigationSummary[]) => ({
  results,
  pagination: { total: results.length, page: 1, per_page: 10 },
});

const emptyList = list();

const mockInvestigationsApi = ({
  listed = emptyList,
}: {
  listed?: ReturnType<typeof list>;
} = {}) => {
  fetchMock.mockImplementation(async (endpoint: string) => {
    if (endpoint === 'GET /internal/nightshift/investigations/availability') {
      return { available: true };
    }
    if (endpoint === 'POST /internal/nightshift/investigations') {
      return { investigation_id: 'investigation-1' };
    }
    throw new Error(`Unexpected ${endpoint}`);
  });
  httpGet.mockResolvedValue(listed);
};

const renderInvestigateAlert = (alertId = 'alert-1') =>
  renderHook(() => useInvestigateAlert({ alertId, ebtElement: 'testElement' }), { wrapper });

describe('useInvestigateAlert', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    getLocator.mockReturnValue(mockLocator);
    unmountToasts = [];
    addSuccess.mockImplementation(({ text }) => {
      if (typeof text !== 'function') return;
      const container = document.createElement('div');
      document.body.appendChild(container);
      const unmount = text(container);
      unmountToasts.push(() => {
        unmount();
        container.remove();
      });
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { get: () => '' }, get: httpGet },
        share: {
          url: {
            locators: {
              get: getLocator,
            },
          },
        },
        notifications: { toasts: { addSuccess, addDanger } },
        rendering: renderingServiceMock.create(),
      },
    });
    setInvestigationsClient({
      fetch: fetchMock,
    } as unknown as NightshiftInvestigationsRepositoryClient);
    mockInvestigationsApi();
  });

  afterEach(() => {
    act(() => unmountToasts.forEach((unmount) => unmount()));
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
    expect(httpGet).toHaveBeenCalledWith(SHARED_INVESTIGATIONS_URL, {
      version: SHARED_INVESTIGATIONS_API_VERSION,
      query: {
        subject_type: 'alert',
        subject_id: 'alert-1',
        sort_field: 'updated_at',
        sort_order: 'desc',
        per_page: 10,
      },
      signal: expect.anything(),
    });
  });

  it('spells out the shared investigations list API', () => {
    expect(SHARED_INVESTIGATIONS_URL).toBe(INVESTIGATIONS_INTERNAL_URL);
    expect(SHARED_INVESTIGATIONS_API_VERSION).toBe(AGENTIC_INVESTIGATIONS_API_VERSION);
  });

  it('hides Investigate until the alert investigation status has loaded', async () => {
    httpGet.mockImplementation(() => new Promise(() => {}));
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));
    expect(result.current.showInvestigateButton).toBe(false);
  });

  it('returns Investigating and disables starts while an agent works on the investigation', async () => {
    mockInvestigationsApi({ listed: list(summary('inv-running', { in_progress: true })) });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.showInvestigateButton).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
    expect(result.current.viewInvestigationUrl).toBe('/app/nightshift?investigationId=inv-running');
    await act(() => result.current.handleInvestigate());
    expect(fetchMock).not.toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations',
      expect.anything()
    );
  });

  it('returns View investigation only for an unviewed investigation nothing works on', async () => {
    mockInvestigationsApi({ listed: list(summary('inv-completed')) });
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
    mockInvestigationsApi({ listed: list(summary('inv-completed')) });
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

  it('refers to the open investigation holding the alert before a closed one', async () => {
    mockInvestigationsApi({
      listed: list(summary('inv-closed', { metadata: { status: 'closed' } }), summary('inv-open')),
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() =>
      expect(result.current.viewInvestigationUrl).toBe('/app/nightshift?investigationId=inv-open')
    );
  });

  it('caps viewed investigation ids at 200 and keeps the latest first', async () => {
    const existingIds = Array.from({ length: 200 }, (_, i) => `old-inv-${i}`);
    window.localStorage.setItem(VIEWED_INVESTIGATIONS_STORAGE_KEY, JSON.stringify(existingIds));

    mockInvestigationsApi({ listed: list(summary('new-inv')) });
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

  it('does not show view investigation while an agent works on the open investigation', async () => {
    mockInvestigationsApi({
      listed: list(
        summary('inv-running', { in_progress: true }),
        summary('inv-closed', { metadata: { status: 'closed' } })
      ),
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.showViewInvestigation).toBe(false);
    expect(result.current.showInvestigateButton).toBe(false);
  });

  it('does not read the shared list without investigation availability', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('Forbidden');
    });
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.showInvestigateAction).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
    expect(httpGet).not.toHaveBeenCalled();
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
    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Investigation started',
      text: expect.any(Function),
    });
    expect(screen.getByText('You will find it in Nightshift')).toBeVisible();
    const viewLink = screen.getByRole('link', { name: 'View investigation' });
    expect(viewLink).toHaveAttribute('href', '/app/nightshift?investigationId=investigation-1');
    // The list does not show the started investigation yet: it counts as in progress anyway.
    await waitFor(() => expect(result.current.investigateActionLabel).toBe('Investigating…'));
    expect(result.current.isInvestigating).toBe(true);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.viewInvestigationUrl).toBe(
      '/app/nightshift?investigationId=investigation-1'
    );
    expect(result.current.viewInvestigationEbtProps).toEqual({
      'data-ebt-action': 'viewInvestigation',
      'data-ebt-element': 'testElement',
      'data-ebt-detail': 'running',
    });
    act(() => result.current.markInvestigationViewed());

    viewLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(viewLink);
    expect(
      JSON.parse(window.localStorage.getItem(VIEWED_INVESTIGATIONS_STORAGE_KEY) || '[]')
    ).toEqual(['investigation-1']);
  });

  it('links to and marks the returned investigation as viewed when an older one is listed', async () => {
    mockInvestigationsApi({ listed: list(summary('older-investigation')) });
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showViewInvestigation).toBe(true));
    act(() => result.current.markInvestigationViewed());

    await act(() => result.current.handleInvestigate());

    const viewLink = screen.getByRole('link', { name: 'View investigation' });
    expect(viewLink).toHaveAttribute('href', '/app/nightshift?investigationId=investigation-1');
    viewLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(viewLink);
    expect(
      JSON.parse(window.localStorage.getItem(VIEWED_INVESTIGATIONS_STORAGE_KEY) || '[]')
    ).toEqual(['investigation-1', 'older-investigation']);
  });

  it('keeps the title-only success toast when the investigation locator is unavailable', async () => {
    getLocator.mockReturnValue(undefined);
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(addSuccess).toHaveBeenCalledWith({ title: 'Investigation started' });
    expect(screen.queryByRole('link', { name: 'View investigation' })).not.toBeInTheDocument();
  });

  it('exposes the started investigation before the list refresh completes', async () => {
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    let resolveList = (value: ReturnType<typeof list>) => {};
    httpGet.mockImplementationOnce(
      () =>
        new Promise<ReturnType<typeof list>>((resolve) => {
          resolveList = resolve;
        })
    );
    let start = Promise.resolve();
    act(() => {
      start = result.current.handleInvestigate();
    });

    await waitFor(() =>
      expect(result.current.viewInvestigationUrl).toBe(
        '/app/nightshift?investigationId=investigation-1'
      )
    );
    expect(result.current.isStarting).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
    await act(async () => {
      resolveList(list(summary('investigation-1', { in_progress: true })));
      await start;
    });
  });

  it('prevents another start while the start request is pending', async () => {
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    let resolveStart = (value: { investigation_id: string }) => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<{ investigation_id: string }>((resolve) => {
          resolveStart = resolve;
        })
    );
    let start = Promise.resolve();
    act(() => {
      start = result.current.handleInvestigate();
    });
    await waitFor(() => expect(result.current.isStarting).toBe(true));
    await act(() => result.current.handleInvestigate());
    expect(
      fetchMock.mock.calls.filter(
        ([endpoint]) => endpoint === 'POST /internal/nightshift/investigations'
      )
    ).toHaveLength(1);
    await act(async () => {
      resolveStart({ investigation_id: 'investigation-1' });
      await start;
    });
  });

  it('does not expose a pending start belonging to another alert', async () => {
    const { result, rerender } = renderHook(
      ({ alertId }) => useInvestigateAlert({ alertId, ebtElement: 'testElement' }),
      { wrapper, initialProps: { alertId: 'alert-1' } }
    );
    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    await act(() => result.current.handleInvestigate());
    rerender({ alertId: 'alert-2' });

    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    expect(result.current.viewInvestigationUrl).toBeUndefined();
    expect(result.current.isInvestigating).toBe(false);
    act(() => result.current.markInvestigationViewed());
    expect(
      JSON.parse(window.localStorage.getItem(VIEWED_INVESTIGATIONS_STORAGE_KEY) || '[]')
    ).toEqual([]);
  });

  it.each([false, true])(
    'keeps the current alert start when an earlier alert request settles with failure=%s',
    async (shouldFail) => {
      const { result, rerender } = renderHook(
        ({ alertId }) => useInvestigateAlert({ alertId, ebtElement: 'testElement' }),
        { wrapper, initialProps: { alertId: 'alert-1' } }
      );
      await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
      let finishStart = () => {};
      fetchMock.mockImplementationOnce(
        () =>
          new Promise<{ investigation_id: string }>((resolve, reject) => {
            finishStart = () => {
              if (shouldFail) {
                reject(new Error('Request failed'));
              } else {
                resolve({ investigation_id: 'first-investigation' });
              }
            };
          })
      );
      let request = Promise.resolve();
      act(() => {
        request = result.current.handleInvestigate();
      });
      await waitFor(() => expect(result.current.isStarting).toBe(true));

      rerender({ alertId: 'alert-2' });
      await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
      expect(result.current.isStarting).toBe(false);
      expect(result.current.viewInvestigationUrl).toBeUndefined();
      fetchMock.mockResolvedValueOnce({ investigation_id: 'second-investigation' });
      await act(() => result.current.handleInvestigate());

      await act(async () => {
        finishStart();
        await request;
      });
      expect(result.current.isStarting).toBe(false);
      expect(result.current.viewInvestigationUrl).toBe(
        '/app/nightshift?investigationId=second-investigation'
      );
      expect(result.current.isInvestigating).toBe(true);
    }
  );

  it('stops exposing an unlisted start after the pending timeout', async () => {
    const { result, rerender } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
    await act(() => result.current.handleInvestigate());
    const now = Date.now();
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now + 2 * 60_000);
    try {
      rerender();
      await waitFor(() => expect(result.current.showInvestigateButton).toBe(true));
      expect(result.current.viewInvestigationUrl).toBeUndefined();
    } finally {
      dateNow.mockRestore();
    }
  });

  it('stops waiting for a started investigation once the list shows it', async () => {
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());
    httpGet.mockResolvedValue(list(summary('investigation-1')));
    await act(() => queryClient.invalidateQueries());

    await waitFor(() => expect(result.current.isInvestigating).toBe(false));
    expect(result.current.showViewInvestigation).toBe(true);
  });

  it('reports start failures', async () => {
    fetchMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === 'POST /internal/nightshift/investigations') {
        throw new Error('Request failed');
      }
      return { available: true };
    });
    const { result } = renderInvestigateAlert();
    await waitFor(() => expect(result.current.showInvestigateAction).toBe(true));

    await act(() => result.current.handleInvestigate());

    expect(addDanger).toHaveBeenCalledWith({
      title: 'Failed to start investigation',
      text: 'Request failed',
    });
    expect(result.current.isStarting).toBe(false);
    expect(result.current.showInvestigateButton).toBe(true);
    expect(result.current.viewInvestigationUrl).toBeUndefined();
    expect(addSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'View investigation' })).not.toBeInTheDocument();
  });

  it('hides actions when the investigation lookup fails', async () => {
    httpGet.mockRejectedValue(new Error('Lookup failed'));
    const { result } = renderInvestigateAlert();

    await waitFor(() => expect(httpGet).toHaveBeenCalled());
    expect(result.current.showInvestigateButton).toBe(false);
    expect(result.current.showViewInvestigation).toBe(false);
    expect(result.current.viewInvestigationUrl).toBeUndefined();
  });

  it('does not fetch alert investigations when enabled is false', async () => {
    renderHook(
      () => useInvestigateAlert({ alertId: 'alert-1', ebtElement: 'testElement', enabled: false }),
      { wrapper }
    );

    expect(httpGet).not.toHaveBeenCalled();
  });

  it('hides the action when the nightshift plugin is unavailable', async () => {
    setInvestigationsClient(undefined);
    const { result } = renderInvestigateAlert();

    expect(result.current.showInvestigateAction).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
