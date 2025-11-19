/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef } from 'react';
import type { RuleCreationStreamEvent } from '../../../../../../server/lib/detection_engine/ai_assisted_rule_creation/iterative_agent/stream_rule_creation';
const INTERNAL_AI_ASSISTED_RULE_CREATE_STREAM_API_PATH =
  '/internal/detection_engine/ai_assisted/_stream';
import type {
  AIAssistedCreateRuleRequestBody,
  AIAssistedCreateRuleResponse,
} from '../../../../../../common/api/detection_engine/ai_assisted/index.gen';

import { KibanaServices } from '../../../../../common/lib/kibana/services';

const streamCreateAiAssistedRuleAPI = async ({
  message,
  connectorId,
  signal,
}: {
  message: string;
  connectorId: string;
  signal?: AbortSignal;
}) => {
  const body: AIAssistedCreateRuleRequestBody = {
    user_query: message,
    connector_id: connectorId,
  };

  return KibanaServices.get().http.fetch(INTERNAL_AI_ASSISTED_RULE_CREATE_STREAM_API_PATH, {
    method: 'POST',
    body: JSON.stringify(body),
    version: '1',
    signal,
    asResponse: true,
    rawResponse: true,
  });
};

export const useAiRuleCreationStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [updates, setUpdates] = useState<RuleCreationStreamEvent[]>([]);

  const streamRuleCreation = useCallback(
    async ({ message, connectorId }: { message: string; connectorId: string }) => {
      setIsStreaming(true);
      setIsCancelled(false);
      setUpdates([]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await streamCreateAiAssistedRuleAPI({
          message,
          connectorId,
          signal: abortController.signal,
        });
        const reader = response?.response?.body?.getReader?.();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Failed to get reader from response body');
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            try {
              const lineParsed = JSON.parse(line);
              const payload = JSON.parse(lineParsed.payload) as RuleCreationStreamEvent;

              setUpdates((prev) => [...prev, payload]);
            } catch (parseError) {
              // eslint-disable-next-line no-console
              console.warn('Failed to parse streaming event:', parseError);
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error during AI-assisted rule creation stream:', error);
        //  const errorMessage = error.message || 'Stream connection failed';
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const cancelRuleCreation = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.error('Error aborting AI-assisted rule creation stream:', error);
      }
      setIsStreaming(false);
      setIsCancelled(true);
    }
  }, []);

  const rule =
    isStreaming === false && isCancelled === false
      ? (updates.at(-1)?.nodeState.rule as AIAssistedCreateRuleResponse['rule']) || null
      : null;

  return {
    streamRuleCreation,
    cancelRuleCreation,
    isStreaming,
    isCancelled,
    rule,
    updates,
  };
};
