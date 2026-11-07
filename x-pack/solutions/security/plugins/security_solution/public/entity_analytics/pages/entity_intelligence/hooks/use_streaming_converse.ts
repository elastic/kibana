/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { of } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';
import type { HuntArtifact } from '../hunt_artifacts';
import type { HuntActivity } from '../hunt_stream_state';
import { createHuntStreamState, reduceHuntStreamEvent } from '../hunt_stream_state';
import { useConverseApi } from './use_converse_api';

const CONVERSE_ASYNC_API_PATH = '/api/agent_builder/converse/async';
const CONVERSE_API_VERSION = '2023-10-31';

export interface StreamConverseCallbacks {
  /** Called with the full accumulated assistant text on every token chunk. */
  onMessageUpdate: (accumulated: string) => void;
  /** Called when tool activity changes. */
  onActivitiesUpdate: (activities: HuntActivity[]) => void;
  /** Called as validated artifacts arrive from tool results or attachments. */
  onArtifactsUpdate: (artifacts: HuntArtifact[]) => void;
  /** Called when the validated event lifecycle changes the hunt status. */
  onStatusUpdate: (status: 'running' | 'completed') => void;
  /** Called as soon as the server assigns a conversation id. */
  onConversationId: (conversationId: string) => void;
}

export interface StreamConverseParams {
  input: string;
  conversationId?: string;
  signal: AbortSignal;
  callbacks: StreamConverseCallbacks;
}

export interface StreamConverseResult {
  message: string;
  conversationId: string | undefined;
}

export interface UseStreamingConverseResult {
  hasConnector: boolean;
  streamConverse: (params: StreamConverseParams) => Promise<StreamConverseResult>;
}

/**
 * Streaming client over the public `/api/agent_builder/converse/async` SSE
 * endpoint. Tokens are surfaced through {@link StreamConverseCallbacks} as
 * they arrive so the transcript can render progressively instead of waiting
 * 30-90s for the sync `/converse` response.
 */
export const useStreamingConverse = (): UseStreamingConverseResult => {
  const { http } = useKibana().services;
  const { connectorId, hasConnector } = useConverseApi();

  const streamConverse = useCallback(
    async ({
      input,
      conversationId,
      signal,
      callbacks,
    }: StreamConverseParams): Promise<StreamConverseResult> => {
      const response = await http.post(CONVERSE_ASYNC_API_PATH, {
        version: CONVERSE_API_VERSION,
        signal,
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({
          input,
          ...(connectorId ? { connector_id: connectorId } : {}),
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
      });

      const body = response.response?.body;
      if (!body) {
        throw new Error('Chat stream returned no response body');
      }

      let state = createHuntStreamState(conversationId);
      const events$ = of({ response: { body } }).pipe(
        httpResponseIntoObservable<Record<string, unknown> & { type: string }>()
      );

      await new Promise<void>((resolve, reject) => {
        const subscription = events$.subscribe({
          next: (event) => {
            const previous = state;
            state = reduceHuntStreamEvent(state, event);
            if (state === previous) return;
            if (state.message !== previous.message) callbacks.onMessageUpdate(state.message);
            if (state.activities !== previous.activities) {
              callbacks.onActivitiesUpdate(state.activities);
            }
            if (state.artifacts !== previous.artifacts) {
              callbacks.onArtifactsUpdate(state.artifacts);
            }
            if (state.status !== previous.status) {
              callbacks.onStatusUpdate(state.status);
            }
            if (state.conversationId && state.conversationId !== previous.conversationId) {
              callbacks.onConversationId(state.conversationId);
            }
          },
          complete: resolve,
          error: reject,
        });
        const onAbort = () => {
          subscription.unsubscribe();
          reject(new DOMException('The chat stream was cancelled', 'AbortError'));
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
          subscription.add(() => signal.removeEventListener('abort', onAbort));
        }
      });

      return { message: state.message, conversationId: state.conversationId };
    },
    [http, connectorId]
  );

  return { hasConnector, streamConverse };
};
