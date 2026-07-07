/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { useAnomalyOverviewForAttachment } from './use_anomaly_overview_for_attachment';

const mockFetch = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: { fetch: mockFetch } } }),
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = 'TestQueryClientProvider';
  return Wrapper;
};

describe('useAnomalyOverviewForAttachment', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('does not fetch privileges or overview when disabled', async () => {
    renderHook(
      () =>
        useAnomalyOverviewForAttachment({ entityId: 'host-1', entityType: 'host', enabled: false }),
      { wrapper: createWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not fetch the overview when the user lacks privileges', async () => {
    mockFetch.mockResolvedValueOnce({ has_all_required: false });

    renderHook(
      () =>
        useAnomalyOverviewForAttachment({ entityId: 'host-1', entityType: 'host', enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/entity_analytics/anomalies/privileges',
      expect.objectContaining({ method: 'GET' })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches the overview for the given entity once privileges are granted', async () => {
    mockFetch.mockResolvedValueOnce({ has_all_required: true });
    mockFetch.mockResolvedValueOnce({ totalAnomaliesCount: 3 });

    const { result } = renderHook(
      () =>
        useAnomalyOverviewForAttachment({ entityId: 'host-1', entityType: 'host', enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data?.totalAnomaliesCount).toBe(3));
    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/entity_analytics/entities/host/host-1/anomaly_overview',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
