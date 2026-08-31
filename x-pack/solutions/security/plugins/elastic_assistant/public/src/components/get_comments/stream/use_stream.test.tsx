/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useStream } from './use_stream';

// Minimum spacing between emissions enforced by the stream observable (stream_observable.ts).
const MIN_DELAY = 10;

const refetchCurrentConversation = jest.fn();
const reader = jest.fn();
const cancel = jest.fn();
// LangChain `{ type: 'content', payload }` lines, matching what the observable parser consumes.
const chunk1 = `{"payload":"","type":"content"}
{"payload":"My","type":"content"}
{"payload":" ","type":"content"}
{"payload":"new","type":"content"}
`;
const chunk2 = `{"payload":" mes","type":"content"}
{"payload":"sage","type":"content"}
`;

const readerComplete = {
  read: reader
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode(chunk1)),
    })
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode(chunk2)),
    })
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode('')),
    })
    .mockResolvedValue({
      done: true,
    }),
  cancel,
  releaseLock: jest.fn(),
  closed: jest.fn().mockResolvedValue(true),
} as unknown as ReadableStreamDefaultReader<Uint8Array>;

const defaultProps = {
  refetchCurrentConversation,
  reader: readerComplete,
  isError: false,
};

describe('useStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should stream response. isLoading/isStreaming are true while streaming, isLoading/isStreaming are false when streaming completes', async () => {
    // Fake timers make the observable's wall-clock throttling (MIN_DELAY-spaced
    // emissions) deterministic, so the transient streaming states can be observed
    // without racing against real timers.
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useStream(defaultProps));
      expect(reader).toHaveBeenCalledTimes(1);

      // Seed emission (emitted with no delay): loading has started but no message
      // content has arrived yet.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(result.current).toEqual({
        error: undefined,
        isLoading: true,
        isStreaming: false,
        pendingMessage: '',
        setComplete: expect.any(Function),
      });

      // First content chunk: streaming is now in progress.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(MIN_DELAY);
      });
      expect(result.current).toEqual({
        error: undefined,
        isLoading: true,
        isStreaming: true,
        pendingMessage: 'My',
        setComplete: expect.any(Function),
      });

      // Drain the remaining chunks through to completion.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(MIN_DELAY * 10);
      });
      expect(result.current).toEqual({
        error: undefined,
        isLoading: false,
        isStreaming: false,
        pendingMessage: 'My new message',
        setComplete: expect.any(Function),
      });
      expect(reader).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should not call observable when content is provided', () => {
    renderHook(() =>
      useStream({
        ...defaultProps,
        content: 'test content',
      })
    );
    expect(reader).not.toHaveBeenCalled();
  });

  it('should handle a stream error and update UseStream object accordingly', async () => {
    const errorMessage = 'Test error message';
    const errorReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new Uint8Array(new TextEncoder().encode(`one chunk`)),
        })
        .mockRejectedValue(new Error(errorMessage)),
      cancel,
      releaseLock: jest.fn(),
      closed: jest.fn().mockResolvedValue(true),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    const { result } = renderHook(() =>
      useStream({
        ...defaultProps,
        reader: errorReader,
      })
    );
    expect(result.current.error).toBeUndefined();

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.pendingMessage).toBe('');
    expect(cancel).toHaveBeenCalled();
  });

  it('should handle an empty content and reader object and return an empty observable', () => {
    const { result } = renderHook(() =>
      useStream({
        ...defaultProps,
        content: '',
        reader: undefined,
      })
    );

    expect(result.current).toEqual({
      error: undefined,
      isLoading: false,
      isStreaming: false,
      pendingMessage: '',
      setComplete: expect.any(Function),
    });
  });
});
