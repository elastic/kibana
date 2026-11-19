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

  it('shares one notification across failing sources and backs off subsequent requests', async () => {
    const sourceIds = ['source-1', 'source-2', 'source-3', 'source-4', 'source-5', 'source-6'];
    mockFetch.mockImplementation(async () => {
      throw new Error('Feature fetch failed');
    });
    renderColumns(sourceIds);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText('—')).toHaveLength(sourceIds.length);
    expect(mockAddError.mock.calls[0][1]).toEqual({
      title: 'Could not refresh KI feature counts',
      toastMessage:
        'Unavailable counts are shown as a dash. Refreshing will continue automatically.',
    });

    const requestsAfterFailure = mockFetch.mock.calls.length;
    await advanceTime(59_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure);
    expect(mockAddError).toHaveBeenCalledTimes(1);

    await advanceTime(1_000);
    expect(mockFetch.mock.calls.length).toBeGreaterThan(requestsAfterFailure);
    expect(mockAddError).toHaveBeenCalledTimes(1);
  });

  it('keeps the existing outage notification when only some sources recover', async () => {
    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    renderColumns(['source-1', 'source-2']);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    mockFetch.mockResolvedValueOnce({ features: [createFeature('orders')] });
    await advanceTime(60_000);
    await screen.findByText('1');

    await advanceTime(10_000);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(mockAddError).toHaveBeenCalledTimes(1);
  });

  it('reports a new outage after all failing sources recover', async () => {
    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    renderColumns(['source-1', 'source-2']);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(60_000);
    expect(await screen.findAllByText('1')).toHaveLength(2);

    mockFetch.mockRejectedValue(new Error('Another feature fetch failure'));
    await advanceTime(10_000);
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(2));
  });

  it('reports a fresh outage when the table remounts with cached failures', async () => {
    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    const { unmount } = renderColumns();
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    unmount();
    renderColumns();
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(2));
  });

  it('shows unavailable counts independently while another source remains forbidden', async () => {
    const forbiddenError = Object.assign(new Error('Forbidden'), {
      body: { statusCode: 403, message: 'Cannot read source source-1' },
      response: { status: 403 },
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
    expect(screen.getByText('—')).toHaveTextContent(/^—$/);

    isSecondSourceFailing = true;
    await advanceTime(10_000);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    isSecondSourceFailing = false;
    secondSourceFeatures = [createFeature('orders')];
    await advanceTime(60_000);
    await screen.findByText('1');
    expect(screen.getByText('—')).toHaveTextContent(/^—$/);
  });

  it('shows a dash during a retry without cached features until the count recovers', async () => {
    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    renderColumns();
    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));
    expect(screen.getByText('—')).toHaveTextContent(/^—$/);

    let completeRetry: ((response: { features: Feature[] }) => void) | undefined;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        completeRetry = resolve;
      })
    );
    await advanceTime(60_000);
    expect(screen.getByText('—')).toHaveTextContent(/^—$/);
    expect(mockAddError).toHaveBeenCalledTimes(1);

    await act(async () => {
      completeRetry?.({ features: [createFeature('orders')] });
    });
    await screen.findByText('1');
    expect(mockAddError).toHaveBeenCalledTimes(1);
  });
});
