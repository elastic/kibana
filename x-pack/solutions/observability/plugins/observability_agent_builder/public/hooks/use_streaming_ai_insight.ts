/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { filter, map, scan, takeUntil, finalize, Observable, type Subscription } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';

interface ParsedEvent {
  type: 'context' | 'chunk' | 'message';
  context?: string;
  content?: string;
}

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

export function useStreamingAiInsight(
  createStream: (signal: AbortSignal) => Observable<InsightStreamEvent>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [wasStopped, setWasStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<Subscription | undefined>(undefined);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setWasStopped(true);
    }
  }, []);

  const fetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = undefined;
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
      const observable$ = createStream(abortController.signal).pipe(
        filter(
          (event: InsightStreamEvent): event is InsightStreamEvent =>
            event.type === 'context' ||
            event.type === 'chatCompletionChunk' ||
            event.type === 'chatCompletionMessage'
        ),
        map((event: InsightStreamEvent): ParsedEvent => {
          if (event.type === 'context') {
            return { type: 'context', context: event.context };
          }
          if (event.type === 'chatCompletionChunk') {
            return { type: 'chunk', content: event.content };
          }
          return { type: 'message', content: event.content };
        }),
        scan<ParsedEvent, InsightResponse>(
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
        takeUntil(abort$),
        finalize(() => {
          setIsLoading(false);
        })
      );

      subscriptionRef.current = observable$.subscribe({
        next: (state: InsightResponse) => {
          setSummary(state.summary);
          setContext(state.context);
        },
        error: (err: unknown) => {
          if (err instanceof AbortError) {
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to load AI insight');
        },
      });
    } catch (e) {
      if (e instanceof AbortError) {
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
    }
  }, [createStream]);

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
