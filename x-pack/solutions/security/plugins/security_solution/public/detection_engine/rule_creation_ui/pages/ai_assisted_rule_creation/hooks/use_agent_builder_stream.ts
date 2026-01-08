/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { defer } from 'rxjs';
import type { Observable } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isToolProgressEvent, isToolResultEvent } from '@kbn/agent-builder-common';
import { getKibanaDefaultAgentCapabilities } from '@kbn/agent-builder-common/agents';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { KibanaServices } from '../../../../../common/lib/kibana/services';

const AGENT_BUILDER_CONVERSE_ASYNC_API_PATH = '/api/agent_builder/converse/async';
const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

export const useAgentBuilderStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const [updates, setUpdates] = useState<Array<{ message: string; timestamp: Date }>>([]);
  const [rule, setRule] = useState<Record<string, unknown> | null>(null);

  const streamRuleCreation = useCallback(
    async ({ message, connectorId }: { message: string; connectorId: string }) => {
      setIsStreaming(true);
      setIsCancelled(false);
      setUpdates([{ message: 'Initializing rule creation process...', timestamp: new Date() }]);
      setRule(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const http = KibanaServices.get().http;
        const payload = {
          input: `Create detection rule based on the following query: ${message}`,
          connector_id: connectorId,
          capabilities: getKibanaDefaultAgentCapabilities(),
          attachments: [{ type: SecurityAgentBuilderAttachments.rule, data: { text: '' } }], // initial empty rule attachment
          browser_api_tools: [],
        };

        // Create Observable from HTTP response using SSE utilities
        const events$: Observable<ChatEvent> = defer(() => {
          return http.post(AGENT_BUILDER_CONVERSE_ASYNC_API_PATH, {
            signal: abortController.signal,
            asResponse: true,
            rawResponse: true,
            body: JSON.stringify(payload),
          });
        }).pipe(
          // @ts-expect-error SseEvent mixin issue
          httpResponseIntoObservable<ChatEvent>()
        );

        // Subscribe to events - only track tool_progress for updates, extract rule from tool_result
        const subscription = events$.subscribe({
          next: (event) => {
            // Only add tool_progress messages to updates array with timestamp
            if (isToolProgressEvent(event)) {
              const eventMessage = event.data?.message || '';
              if (eventMessage) {
                setUpdates((prev) => [...prev, { message: eventMessage, timestamp: new Date() }]);
              }
            }

            // Extract rule from security.create_detection_rule tool_result events
            if (
              isToolResultEvent(event) &&
              event.data?.tool_id === SECURITY_CREATE_DETECTION_RULE_TOOL_ID
            ) {
              const result = event.data?.results?.[0];
              if (result?.type === 'other' && result.data?.success && result.data?.rule) {
                setRule(result.data.rule as Record<string, unknown>);
              }
            }
          },
          error: (error) => {
            // eslint-disable-next-line no-console
            console.error('Error during agent builder stream:', error);
            setIsStreaming(false);
          },
          complete: () => {
            setIsStreaming(false);
            subscriptionRef.current = null;
          },
        });

        subscriptionRef.current = subscription;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error starting agent builder stream:', error);
        setIsStreaming(false);
        subscriptionRef.current = null;
      }
    },
    []
  );

  const cancelRuleCreation = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error aborting agent builder stream:', error);
      }
    }

    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error unsubscribing from stream:', error);
      }
      subscriptionRef.current = null;
    }

    setIsStreaming(false);
    setIsCancelled(true);
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Rule is extracted directly from tool_result events and stored in state
  // Only return rule when streaming is complete and not cancelled
  const finalRule = isStreaming === false && isCancelled === false ? rule : null;

  return {
    streamRuleCreation,
    cancelRuleCreation,
    isStreaming,
    isCancelled,
    rule: finalRule,
    updates,
  };
};
