/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { of, Observable } from 'rxjs';
import { useStreamingAiInsight, type InsightStreamEvent } from './use_streaming_ai_insight';

describe('useStreamingAiInsight', () => {
  it('builds summary and context from stream events', async () => {
    const createStream = jest.fn(() =>
      of(
        { type: 'context', context: 'ctx' } as InsightStreamEvent,
        { type: 'chatCompletionChunk', content: 'Hello ' } as InsightStreamEvent,
        { type: 'chatCompletionChunk', content: 'world' } as InsightStreamEvent
      )
    );

    const { result, unmount } = renderHook(() => useStreamingAiInsight(createStream));

    act(() => {
      result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBe('Hello world');
    expect(result.current.context).toBe('ctx');
    unmount();
  });

  it('uses the final chat completion message as summary', async () => {
    const createStream = jest.fn(() =>
      of<InsightStreamEvent>({ type: 'chatCompletionMessage', content: 'Final message' })
    );

    const { result, unmount } = renderHook(() => useStreamingAiInsight(createStream));

    act(() => {
      result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBe('Final message');
    unmount();
  });

  it('captures stream errors', async () => {
    const createStream = jest.fn(
      () =>
        new Observable<InsightStreamEvent>((subscriber) => {
          subscriber.error(new Error('Boom'));
        })
    );

    const { result, unmount } = renderHook(() => useStreamingAiInsight(createStream));

    act(() => {
      result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Boom');
    });
    unmount();
  });

});
