/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import type { HttpSetup } from '@kbn/core/public';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactQueryClientProvider } from '../../../../../common/containers/query_client/query_client_provider';

import { useActionTriggeredGenerations } from '.';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import type { ActionTriggeredGenerationsResponse } from '../types';

jest.mock('../../../../../common/hooks/use_app_toasts');

const mockResponse: ActionTriggeredGenerationsResponse = {
  data: [
    {
      connector_id: 'connector-1',
      execution_uuid: 'exec-uuid-1',
      source_metadata: {
        action_execution_uuid: 'action-1',
        rule_id: 'rule-1',
        rule_name: 'Test Rule',
      },
      status: 'succeeded',
      timestamp: '2026-03-09T12:00:00.000Z',
    },
  ],
  total: 1,
};

const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element =>
  React.createElement(ReactQueryClientProvider, null, children);

describe('useActionTriggeredGenerations', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  let httpMock: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    const coreStart = coreMock.createStart({ basePath: '/mock' });
    httpMock = coreStart.http as jest.Mocked<HttpSetup>;
    httpMock.fetch.mockResolvedValue(mockResponse);
  });

  it('fetches action-triggered generations with default params', async () => {
    const { result } = renderHook(() => useActionTriggeredGenerations({ http: httpMock }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        method: 'GET',
        query: { from: 0, size: 20 },
        version: '1',
      })
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it('fetches with custom pagination params', async () => {
    const { result } = renderHook(
      () => useActionTriggeredGenerations({ from: 20, http: httpMock, size: 10 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 20, size: 10 },
      })
    );
  });

  it('passes end param in query when provided', async () => {
    const { result } = renderHook(
      () => useActionTriggeredGenerations({ end: 'now', http: httpMock }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { end: 'now', from: 0, size: 20 },
      })
    );
  });

  it('passes search param in query when provided', async () => {
    const { result } = renderHook(
      () => useActionTriggeredGenerations({ http: httpMock, search: 'test rule' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 0, search: 'test rule', size: 20 },
      })
    );
  });

  it('passes start param in query when provided', async () => {
    const { result } = renderHook(
      () => useActionTriggeredGenerations({ http: httpMock, start: 'now-24h' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 0, size: 20, start: 'now-24h' },
      })
    );
  });

  it('passes status param in query when provided', async () => {
    const { result } = renderHook(
      () =>
        useActionTriggeredGenerations({
          http: httpMock,
          status: ['running', 'failed'],
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 0, size: 20, status: ['running', 'failed'] },
      })
    );
  });

  it('passes all filter params together', async () => {
    const { result } = renderHook(
      () =>
        useActionTriggeredGenerations({
          end: 'now',
          http: httpMock,
          search: 'my rule',
          start: 'now-7d',
          status: ['succeeded'],
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: {
          end: 'now',
          from: 0,
          search: 'my rule',
          size: 20,
          start: 'now-7d',
          status: ['succeeded'],
        },
      })
    );
  });

  it('refetches when filter params change', async () => {
    const { result, rerender } = renderHook(
      ({ status }: { status?: string[] }) =>
        useActionTriggeredGenerations({ http: httpMock, status }),
      { initialProps: { status: ['running'] }, wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledTimes(1);

    rerender({ status: ['failed'] });

    await waitFor(() => expect(httpMock.fetch).toHaveBeenCalledTimes(2));

    expect(httpMock.fetch).toHaveBeenLastCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 0, size: 20, status: ['failed'] },
      })
    );
  });

  it('does not include undefined filter params in query', async () => {
    const { result } = renderHook(() => useActionTriggeredGenerations({ http: httpMock }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(httpMock.fetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/_action_triggered_generations',
      expect.objectContaining({
        query: { from: 0, size: 20 },
      })
    );
  });

  it('invokes addError on failure', async () => {
    httpMock.fetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useActionTriggeredGenerations({ http: httpMock }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10000 });

    expect(appToastsMock.addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        title: 'Failed to fetch action-triggered runs',
      })
    );
  }, 15000);
});
