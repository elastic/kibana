/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useSourceFetcher } from './source';

jest.mock('../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

jest.mock('./notifications', () => ({
  useSourceNotifier: () => ({ updateSuccess: jest.fn(), updateFailure: jest.fn() }),
}));

jest.mock('./metrics_view', () => ({
  MetricsDataViewProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.Mock;

describe('useSourceFetcher', () => {
  let fetch: jest.Mock;
  let patch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetch = jest.fn().mockResolvedValue({});
    patch = jest.fn().mockResolvedValue({});
    useKibanaContextForPluginMock.mockReturnValue({
      services: { http: { fetch, patch }, telemetry: undefined },
    });
  });

  it('requests the source configuration for the given source id', async () => {
    renderHook(() => useSourceFetcher({ sourceId: 'default' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      '/api/metrics/source/default',
      expect.objectContaining({ method: 'GET', query: { includeStatus: true } })
    );
  });

  it('encodes the source id when loading the source configuration', async () => {
    renderHook(() => useSourceFetcher({ sourceId: '../../status' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls[0][0]).toBe('/api/metrics/source/..%2F..%2Fstatus');
  });

  it('encodes the source id when persisting the source configuration', async () => {
    const { result } = renderHook(() => useSourceFetcher({ sourceId: '../../status' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.persistSourceConfiguration({ name: 'updated' });
    });

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0][0]).toBe('/api/metrics/source/..%2F..%2Fstatus');
  });
});
