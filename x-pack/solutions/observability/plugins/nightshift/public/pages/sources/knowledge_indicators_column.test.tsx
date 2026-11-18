/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SignificantEventsWorkflowStatus, type Feature } from '@kbn/significant-events-schema';
import { KnowledgeIndicatorsColumn } from './knowledge_indicators_column';

const mockFetch = jest.fn<Promise<{ features: Feature[] }>, []>();
const mockAddError = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: { significantEventsRepositoryClient: { fetch: mockFetch } },
      notifications: { toasts: { addError: mockAddError } },
    },
  }),
}));

const createFeature = (id: string): Feature => ({
  id,
  uuid: `uuid-${id}`,
  source_id: 'source-1',
  type: 'entity',
  subtype: 'service',
  title: id,
  description: `${id} service`,
  properties: { 'service.name': id },
  confidence: 80,
});

const initialFeatures = [createFeature('checkout'), createFeature('payments')];

describe('KnowledgeIndicatorsColumn polling', () => {
  let queryClient: QueryClient;

  const renderColumn = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <KnowledgeIndicatorsColumn
          sourceId="source-1"
          streamOnboardingResult={{
            status: SignificantEventsWorkflowStatus.Canceled,
            executionId: 'stopped-run',
          }}
          isAwaitingRun={false}
        />
      </QueryClientProvider>
    );

  const advanceTime = async (milliseconds: number) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(milliseconds);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockAddError.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    jest.useRealTimers();
  });

  it('refreshes a stopped source after cleanup and keeps watching for new knowledge', async () => {
    mockFetch.mockResolvedValue({ features: initialFeatures });
    renderColumn();
    await screen.findByText('2');

    mockFetch.mockResolvedValue({ features: [] });
    await advanceTime(10_000);
    await screen.findByText('—');

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(10_000);
    await screen.findByText('1');
  });

  it('retains the count and retries failures slowly without repeated toasts, then resumes polling', async () => {
    mockFetch.mockResolvedValue({ features: initialFeatures });
    renderColumn();
    await screen.findByText('2');

    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    await advanceTime(10_000);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));
    expect(screen.getByText('2')).toBeInTheDocument();

    const requestsAfterFailure = mockFetch.mock.calls.length;
    await advanceTime(59_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure);
    expect(mockAddError).toHaveBeenCalledTimes(1);

    await advanceTime(1_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure + 1);
    expect(mockAddError).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2')).toBeInTheDocument();

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(60_000);
    await screen.findByText('1');

    mockFetch.mockResolvedValue({ features: [] });
    await advanceTime(10_000);
    await screen.findByText('—');

    mockFetch.mockRejectedValue(new Error('Another feature fetch failure'));
    await advanceTime(10_000);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(2));
  });
});
