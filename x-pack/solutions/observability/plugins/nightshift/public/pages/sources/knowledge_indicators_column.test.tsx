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

const mockFetch = jest.fn<
  Promise<{ features: Feature[] }>,
  [string, { params: { path: { sourceId: string } } }]
>();
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

  const renderColumns = (sourceIds = ['source-1']) =>
    render(
      <QueryClientProvider client={queryClient}>
        {sourceIds.map((sourceId) => (
          <KnowledgeIndicatorsColumn
            key={sourceId}
            sourceId={sourceId}
            streamOnboardingResult={{
              status: SignificantEventsWorkflowStatus.Canceled,
              executionId: 'stopped-run',
            }}
            isAwaitingRun={false}
          />
        ))}
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
    renderColumns();
    await screen.findByText('2');

    mockFetch.mockResolvedValue({ features: [] });
    await advanceTime(10_000);
    await screen.findByText('—');

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(10_000);
    await screen.findByText('1');
  });

  it('shares one outage notification across sources and resumes polling after recovery', async () => {
    const sourceIds = ['source-1', 'source-2', 'source-3', 'source-4', 'source-5', 'source-6'];
    mockFetch.mockResolvedValue({ features: initialFeatures });
    const { unmount } = renderColumns(sourceIds);
    expect(await screen.findAllByText('2')).toHaveLength(sourceIds.length);

    mockFetch.mockImplementation(async () => {
      throw new Error('Feature fetch failed');
    });
    await advanceTime(10_000);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText('2')).toHaveLength(sourceIds.length);

    const requestsAfterFailure = mockFetch.mock.calls.length;
    await advanceTime(59_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure);
    expect(mockAddError).toHaveBeenCalledTimes(1);

    await advanceTime(1_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure + sourceIds.length);
    expect(mockAddError).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('2')).toHaveLength(sourceIds.length);

    mockFetch.mockResolvedValueOnce({ features: [createFeature('orders')] });
    await advanceTime(60_000);
    await screen.findByText('1');
    expect(screen.getAllByText('2')).toHaveLength(sourceIds.length - 1);

    await advanceTime(10_000);
    expect(mockAddError).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(60_000);
    expect(await screen.findAllByText('1')).toHaveLength(sourceIds.length);

    mockFetch.mockResolvedValue({ features: [] });
    await advanceTime(10_000);
    expect(await screen.findAllByText('—')).toHaveLength(sourceIds.length);

    mockFetch.mockRejectedValue(new Error('Another feature fetch failure'));
    await advanceTime(10_000);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(2));

    unmount();
    renderColumns(sourceIds);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(3));
  });

  it('shows each source failure and recovery while another source remains forbidden', async () => {
    const forbiddenError = Object.assign(new Error('Forbidden'), {
      body: { statusCode: 403, message: 'Access to this source is forbidden' },
      request: { url: '/internal/streams/source-1/features' },
    });
    const unavailableError = Object.assign(new Error('Service unavailable'), {
      body: { statusCode: 503, message: 'KI features are temporarily unavailable' },
      request: { url: '/internal/streams/source-2/features' },
    });
    let isSecondSourceFailing = false;
    let secondSourceFeatures = initialFeatures;

    mockFetch.mockImplementation(
      async (
        _route,
        {
          params: {
            path: { sourceId },
          },
        }
      ) => {
        if (sourceId === 'source-1') {
          throw forbiddenError;
        }
        if (isSecondSourceFailing) {
          throw unavailableError;
        }
        return { features: secondSourceFeatures };
      }
    );

    renderColumns(['source-1', 'source-2']);
    await screen.findByText('2');
    const forbiddenLabel =
      'Could not refresh the KI feature count: Access to this source is forbidden';
    const unavailableLabel =
      'Could not refresh the KI feature count: KI features are temporarily unavailable';

    expect(await screen.findByText(forbiddenLabel)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(unavailableLabel)).not.toBeInTheDocument();
    expect(mockAddError).toHaveBeenCalledTimes(1);
    expect(mockAddError.mock.calls[0][1]).toEqual({
      title: 'Could not refresh KI feature counts',
      toastMessage:
        'Counts may be out of date. Check the warning icons in the Sources table for details.',
    });

    isSecondSourceFailing = true;
    await advanceTime(10_000);
    expect(await screen.findByText(unavailableLabel)).toBeInTheDocument();
    expect(screen.getByText(forbiddenLabel)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(mockAddError).toHaveBeenCalledTimes(1);

    isSecondSourceFailing = false;
    secondSourceFeatures = [createFeature('orders')];
    await advanceTime(60_000);
    await screen.findByText('1');
    expect(screen.queryByText(unavailableLabel)).not.toBeInTheDocument();
    expect(screen.getByText(forbiddenLabel)).toBeInTheDocument();
    expect(mockAddError).toHaveBeenCalledTimes(1);
  });
});
