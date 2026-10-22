/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { GetMitreEntitiesResponse } from '@kbn/security-mitre-attack-common';
import { useFetchMitreEntitiesQuery } from './use_fetch_mitre_entities_query';

const response: GetMitreEntitiesResponse = {
  framework: 'enterprise',
  framework_version: '1.0',
  tactics: [],
  techniques: [],
  subtechniques: [],
};

const createHttpError = (status: number, body?: Record<string, unknown>) =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body,
  });

const unavailableError = () =>
  createHttpError(503, {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'MITRE data unavailable: population_failed',
  });

describe('useFetchMitreEntitiesQuery', () => {
  const http = httpServiceMock.createStartContract();
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const renderQuery = () =>
    renderHook(() => useFetchMitreEntitiesQuery(http, {}, { retryDelay: 0 }), { wrapper });

  beforeEach(() => {
    jest.clearAllMocks();
    http.fetch.mockReset();
    queryClient = new QueryClient({
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('retries a 503 and returns data once the request succeeds', async () => {
    http.fetch.mockRejectedValueOnce(unavailableError()).mockResolvedValueOnce(response);

    const { result } = renderQuery();

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('stops after the maximum number of retries on a persistent 503', async () => {
    http.fetch.mockRejectedValue(unavailableError());

    const { result } = renderQuery();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(http.fetch).toHaveBeenCalledTimes(4);
  });

  it('does not retry non-503 errors', async () => {
    http.fetch.mockRejectedValue(createHttpError(400, { statusCode: 400 }));

    const { result } = renderQuery();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(http.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries when 503 is only present on the response status', async () => {
    http.fetch.mockRejectedValueOnce(createHttpError(503)).mockResolvedValueOnce(response);

    const { result } = renderQuery();

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(http.fetch).toHaveBeenCalledTimes(2);
  });
});
