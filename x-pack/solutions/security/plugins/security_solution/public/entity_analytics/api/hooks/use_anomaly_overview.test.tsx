/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useAnomalyOverview } from './use_anomaly_overview';
import { useEntityAnalyticsRoutes } from '../api';

jest.mock('../api');

const mockFetchAnomalyOverview = jest.fn();
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchAnomalyOverview: mockFetchAnomalyOverview,
  });
  mockFetchAnomalyOverview.mockResolvedValue({});
});

describe('useAnomalyOverview', () => {
  it('forwards a caller-supplied executionContext to fetchAnomalyOverview', async () => {
    const executionContext = {
      child: {
        type: 'security_solution',
        name: 'entity_analytics:entity_details_flyout',
        id: 'anomaly_overview',
      },
    };

    renderHook(
      () => useAnomalyOverview({ entityId: 'host-1', entityType: 'host', executionContext }),
      { wrapper: TestWrapper }
    );

    await waitFor(() =>
      expect(mockFetchAnomalyOverview).toHaveBeenCalledWith(
        expect.objectContaining({ context: executionContext })
      )
    );
  });

  it('omits context when the caller does not supply executionContext', async () => {
    renderHook(() => useAnomalyOverview({ entityId: 'host-1', entityType: 'host' }), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(mockFetchAnomalyOverview).toHaveBeenCalled());
    const [callArg] = mockFetchAnomalyOverview.mock.calls[0];
    expect(callArg.context).toBeUndefined();
  });

  it('sends no body in single mode when no filters are set', async () => {
    renderHook(
      () => useAnomalyOverview({ entityId: 'host-1', entityType: 'host', mode: 'single' }),
      { wrapper: TestWrapper }
    );

    await waitFor(() =>
      expect(mockFetchAnomalyOverview).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'host-1', entityType: 'host', body: undefined })
      )
    );
  });

  it('sends the resolved mode in the body so the server covers the resolution group', async () => {
    renderHook(
      () => useAnomalyOverview({ entityId: 'host-1', entityType: 'host', mode: 'resolved' }),
      { wrapper: TestWrapper }
    );

    await waitFor(() =>
      expect(mockFetchAnomalyOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'host-1',
          entityType: 'host',
          body: expect.objectContaining({ mode: 'resolved' }),
        })
      )
    );
  });

  it('does not fetch when no entity id is provided', async () => {
    const { result } = renderHook(() => useAnomalyOverview({ entityId: '', entityType: 'host' }), {
      wrapper: TestWrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchAnomalyOverview).not.toHaveBeenCalled();
  });
});
