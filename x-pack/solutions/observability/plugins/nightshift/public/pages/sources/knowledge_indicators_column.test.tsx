/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const errorTooltip = 'Unable to refresh the KI feature count. Retrying automatically.';

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

  const expectErrorTooltip = async (trigger: HTMLElement) => {
    fireEvent.mouseOver(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(errorTooltip);
    fireEvent.mouseOut(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
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

  it('backs off failures silently and restores normal polling after recovery', async () => {
    const sourceIds = ['source-1', 'source-2', 'source-3', 'source-4', 'source-5', 'source-6'];
    mockFetch.mockResolvedValue({ features: initialFeatures });
    renderColumns(sourceIds);
    expect(await screen.findAllByText('2')).toHaveLength(sourceIds.length);

    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    await advanceTime(10_000);
    expect(await screen.findAllByText(errorTooltip)).toHaveLength(sourceIds.length);

    const requestsAfterFailure = mockFetch.mock.calls.length;
    await advanceTime(59_000);
    expect(mockFetch).toHaveBeenCalledTimes(requestsAfterFailure);

    mockFetch.mockResolvedValue({ features: [createFeature('orders')] });
    await advanceTime(1_000);
    expect(await screen.findAllByText('1')).toHaveLength(sourceIds.length);

    mockFetch.mockResolvedValue({ features: [] });
    await advanceTime(10_000);
    expect(await screen.findAllByText('—')).toHaveLength(sourceIds.length);
    expect(mockAddError).not.toHaveBeenCalled();
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
    await expectErrorTooltip(await screen.findByText(errorTooltip));
    expect(screen.queryByText('—')).not.toBeInTheDocument();

    isSecondSourceFailing = true;
    await advanceTime(10_000);
    expect(screen.getAllByText(errorTooltip)).toHaveLength(2);
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    isSecondSourceFailing = false;
    secondSourceFeatures = [createFeature('orders')];
    await advanceTime(60_000);
    await screen.findByText('1');
    expect(screen.getByText(errorTooltip)).toBeInTheDocument();
  });

  it('keeps the error icon focused during a retry without cached features', async () => {
    mockFetch.mockRejectedValue(new Error('Feature fetch failed'));
    renderColumns();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    const errorIcon = await screen.findByText(errorTooltip);
    act(() => errorIcon.focus());
    expect(errorIcon).toHaveFocus();
    fireEvent.keyDown(errorIcon, { key: 'Escape' });

    let completeRetry: ((response: { features: Feature[] }) => void) | undefined;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        completeRetry = resolve;
      })
    );
    await advanceTime(60_000);
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon).toHaveFocus();

    await act(async () => {
      completeRetry?.({ features: [] });
    });
    await waitFor(() => expect(errorIcon).not.toBeInTheDocument());
    expect(screen.getByText('—')).toHaveTextContent(/^—$/);
  });
});
