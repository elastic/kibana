/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { scan, takeUntil, finalize, Observable } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';

interface ContextEvent {
  type: 'context';
  context: string;
}

interface ChatCompletionChunkEvent {
  type: 'chatCompletionChunk';
  content: string;
}

interface ChatCompletionMessageEvent {
  type: 'chatCompletionMessage';
  content: string;
}

export type InsightStreamEvent =
  | ContextEvent
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent;

export interface InsightResponse {
  summary: string;
  context: string;
}

const handleStreamError = (err: unknown, setError: (error: string | undefined) => void): void => {
  if (err instanceof AbortError) {
    return;
  }
  setError(err instanceof Error ? err.message : 'Failed to load AI insight');
};

export function useStreamingAiInsight(
  createStream: (signal: AbortSignal) => Observable<InsightStreamEvent>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [wasStopped, setWasStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cleanupRef = useRef<() => void>();

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setWasStopped(true);
    }
  }, []);

  const fetch = useCallback(() => {
    cleanupRef.current?.();

    setIsLoading(true);
    setError(undefined);
    setWasStopped(false);
    setSummary('');
    setContext('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const abort$ = new Observable<void>((subscriber) => {
      if (abortController.signal.aborted) {
        subscriber.next();
        subscriber.complete();
        return;
      }
      const handler = () => {
        subscriber.next();
        subscriber.complete();
      };
      abortController.signal.addEventListener('abort', handler);
      return () => abortController.signal.removeEventListener('abort', handler);
    });

    try {
      const observable$ = createStream(abortController.signal).pipe(
        scan<InsightStreamEvent, InsightResponse>(
          (acc, event) => {
            if (event.type === 'context') {
              return { ...acc, context: event.context };
            }
            if (event.type === 'chatCompletionChunk') {
              return { ...acc, summary: acc.summary + event.content };
            }
            if (event.type === 'chatCompletionMessage') {
              return { ...acc, summary: event.content };
            }
            return acc;
          },
          { summary: '', context: '' }
        ),
        takeUntil(abort$),
        finalize(() => {
          setIsLoading(false);
        })
      );

      const subscription = observable$.subscribe({
        next: (state: InsightResponse) => {
          setSummary(state.summary);
          setContext(state.context);
        },
        error: (err: unknown) => handleStreamError(err, setError),
      });

      cleanupRef.current = () => {
        abortController.abort();
        subscription.unsubscribe();
      };
    } catch (e) {
      handleStreamError(e, setError);
      setIsLoading(false);
    }
  }, [createStream]);

  useEffect(() => () => cleanupRef.current?.(), []);

  return {
    isLoading,
    error,
    summary,
    context,
    wasStopped,
    fetch,
    stop,
    regenerate: fetch,
  };
}
