/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '../../hooks/use_kibana';
import {
  EVENT_SOURCE,
  SAMPLE_EVENT_SOURCE,
  createGeneration,
} from '../components/shared/test_helpers';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from '../constants';
import type { AnalyticsEventSource } from '../types';
import { useSourceGeneration } from './use_source_generation';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const AVAILABILITY_PATH = '/internal/search_homepage/analytics/generation/availability';
const GENERATION_PATH = '/internal/search_homepage/analytics/generation';

describe('useSourceGeneration', () => {
  const setup = ({
    canShowAgentBuilder = true,
    hasAgentBuilder = true,
  }: { canShowAgentBuilder?: boolean; hasAgentBuilder?: boolean } = {}) => {
    const { http } = coreMock.createStart();
    const reportUiCounter = jest.fn();
    http.get.mockResolvedValue({ available: true, sampleValues: true });
    http.post.mockResolvedValue(createGeneration());
    mockUseKibana.mockReturnValue({
      services: {
        http,
        usageCollection: { reportUiCounter },
        application: { capabilities: { agentBuilder: { show: canShowAgentBuilder } } },
        agentBuilder: hasAgentBuilder ? {} : undefined,
      },
    });
    const queryClient = new QueryClient({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return {
      http,
      reportUiCounter,
      render: (initialSource: AnalyticsEventSource = EVENT_SOURCE) => {
        const initialProps: { source: AnalyticsEventSource | undefined } = {
          source: initialSource,
        };
        return renderHook(({ source }) => useSourceGeneration(source), { wrapper, initialProps });
      },
    };
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('checks availability first, then asks for the source with the selected use case', async () => {
    localStorage.setItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ selectedUseCaseId: 'transactions' })
    );
    const { http, render } = setup();

    const { result } = render();

    expect(result.current.status).toBe('pending');
    expect(http.post).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(http.get).toHaveBeenCalledWith(AVAILABILITY_PATH, expect.anything());
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(
      GENERATION_PATH,
      expect.objectContaining({
        body: JSON.stringify({
          source: 'clickstream-events',
          timeField: '@timestamp',
          useCaseId: 'transactions',
        }),
      })
    );
    expect(result.current.data?.queries).toHaveLength(3);
  });

  it.each([
    ['sample data', SAMPLE_EVENT_SOURCE, {}],
    ['a user who cannot use Agent Builder', EVENT_SOURCE, { canShowAgentBuilder: false }],
    ['a deployment without Agent Builder', EVENT_SOURCE, { hasAgentBuilder: false }],
  ])('requests nothing for %s', async (_, source, options) => {
    const { http, render } = setup(options);

    const { result } = render(source);

    expect(result.current.status).toBe('unavailable');
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('requests nothing without a source', () => {
    const { http, render } = setup();

    const { result, rerender } = render();
    rerender({ source: undefined });

    expect(result.current.status).toBe('unavailable');
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([
    ['says generation is unavailable', { available: false, reason: 'noModel', sampleValues: true }],
    ['cannot be reached', new Error('forbidden')],
  ])('generates nothing when the server %s', async (_, availability) => {
    const { http, render } = setup();
    if (availability instanceof Error) {
      http.get.mockRejectedValue(availability);
    } else {
      http.get.mockResolvedValue(availability);
    }

    const { result } = render();

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(http.post).not.toHaveBeenCalled();
  });

  it('counts a failed generation and reports it without an error to show', async () => {
    const { http, reportUiCounter, render } = setup();
    http.post.mockRejectedValue(new Error('bad gateway'));

    const { result } = render();

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.data).toBeUndefined();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'count',
      'searchHomepageAnalytics_generation_failed'
    );
  });

  it('counts an answer that leaves a part to the built-in generator', async () => {
    const { http, reportUiCounter, render } = setup();
    http.post.mockResolvedValue(createGeneration({ panels: null }));

    const { result } = render();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'count',
      'searchHomepageAnalytics_generation_insufficient'
    );
  });

  it('asks for new questions on request and replaces the answer', async () => {
    const { http, render } = setup();
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    http.post.mockResolvedValue(createGeneration({ generatedAt: 2 }));

    act(() => result.current.regenerate());

    await waitFor(() => expect(result.current.data?.generatedAt).toBe(2));
    expect(http.post).toHaveBeenLastCalledWith(
      GENERATION_PATH,
      expect.objectContaining({
        body: JSON.stringify({
          source: 'clickstream-events',
          timeField: '@timestamp',
          refresh: true,
        }),
      })
    );
    expect(result.current.hasRegenerateFailed).toBe(false);
  });

  it('keeps the earlier answer and counts the failure when regenerating fails', async () => {
    const { http, reportUiCounter, render } = setup();
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    http.post.mockRejectedValue(new Error('rate limited'));

    act(() => result.current.regenerate());

    await waitFor(() => expect(result.current.hasRegenerateFailed).toBe(true));
    expect(result.current.status).toBe('ready');
    expect(result.current.data?.generatedAt).toBe(1);
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'count',
      'searchHomepageAnalytics_generation_regenerate_failed'
    );
  });
});
