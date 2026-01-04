/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defer, from, filter, map, scan, takeUntil, Observable } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';

interface InsightState {
  summary: string;
  context: string;
}

interface ParsedEvent {
  type: 'context' | 'chunk' | 'message';
  context?: string;
  content?: string;
}

export function useStreamingAiInsight(fetchInsight: (signal?: AbortSignal) => Promise<Response>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [wasStopped, setWasStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setWasStopped(true);
    }
  }, []);

  const fetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

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
      abortController.signal.addEventListener('abort', () => {
        subscriber.next();
        subscriber.complete();
      });
    });

    try {
      const observable$ = defer(() =>
        from(fetchInsight(abortController.signal)).pipe(
          map((response) => ({ response }))
        )
      ).pipe(
        httpResponseIntoObservable(),
        filter(
          (event: { type: string }): boolean =>
            event.type === 'context' ||
            event.type === 'chatCompletionChunk' ||
            event.type === 'chatCompletionMessage'
        ),
        map((event: { type: string; [key: string]: unknown }): ParsedEvent => {
          if (event.type === 'context') {
            return { type: 'context', context: (event.context as string) || '' };
          }
          if (event.type === 'chatCompletionChunk') {
            return { type: 'chunk', content: (event.content as string) || '' };
          }
          return { type: 'message', content: (event.content as string) || '' };
        }),
        scan<ParsedEvent, InsightState>(
          (acc, event) => {
            if (event.type === 'context') {
              return { ...acc, context: event.context || '' };
            }
            if (event.type === 'chunk') {
              return { ...acc, summary: acc.summary + (event.content || '') };
            }
            if (event.type === 'message') {
              return { ...acc, summary: event.content || '' };
            }
            return acc;
          },
          { summary: '', context: '' }
        ),
        takeUntil(abort$)
      );

      const subscription = observable$.subscribe({
        next: (state) => {
          setSummary(state.summary);
          setContext(state.context);
        },
        error: (err: unknown) => {
          if (err instanceof AbortError) {
            setIsLoading(false);
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to load AI insight');
          setIsLoading(false);
        },
        complete: () => {
          setIsLoading(false);
        },
      });

      subscriptionRef.current = subscription;
    } catch (e) {
      if (e instanceof AbortError) {
        setIsLoading(false);
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
      setIsLoading(false);
    }
  }, [fetchInsight]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const regenerate = fetch;

  return {
    isLoading,
    error,
    summary,
    context,
    wasStopped,
    fetch,
    stop,
    regenerate,
  };
}
