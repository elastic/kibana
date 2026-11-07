/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatResponse } from '@kbn/agent-builder-plugin/common/http_api/chat';
import { useKibana } from '../../../../common/lib/kibana';
import { useDefaultAiConnector } from './use_default_ai_connector';

/** Converse calls can take a while when the agent runs tools; allow up to 3 minutes. */
const CONVERSE_TIMEOUT_MS = 3 * 60 * 1000;

const CONVERSE_API_PATH = '/api/agent_builder/converse';
const CONVERSE_API_VERSION = '2023-10-31';

export interface ConverseResult {
  message: string;
  conversationId: string;
}

export interface UseConverseApiResult {
  /** Resolved connector id ('' when none is configured). */
  connectorId: string;
  /** Human-readable connector name for provenance ('' when none is configured). */
  connectorName: string;
  hasConnector: boolean;
  isConnectorLoading: boolean;
  converse: (
    input: string,
    conversationId?: string,
    signal?: AbortSignal
  ) => Promise<ConverseResult>;
}

/**
 * Thin client over the Agent Builder `/api/agent_builder/converse` endpoint.
 * Resolves the connector via {@link useDefaultAiConnector}, honoring Kibana's
 * configured default AI connector first, then the user's stored assistant
 * connector, then the first connector the server resolves for the feature.
 */
export const useConverseApi = (): UseConverseApiResult => {
  const { http } = useKibana().services;

  const { connectorId, connectorName, isLoading: isConnectorLoading } = useDefaultAiConnector();

  const converse = useCallback(
    async (
      input: string,
      conversationId?: string,
      signal?: AbortSignal
    ): Promise<ConverseResult> => {
      const abortController = new AbortController();
      const abort = () => abortController.abort();
      if (signal?.aborted) abort();
      signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(() => abortController.abort(), CONVERSE_TIMEOUT_MS);
      try {
        const response = await http.post<ChatResponse>(CONVERSE_API_PATH, {
          version: CONVERSE_API_VERSION,
          signal: abortController.signal,
          body: JSON.stringify({
            input,
            ...(connectorId ? { connector_id: connectorId } : {}),
            ...(conversationId ? { conversation_id: conversationId } : {}),
          }),
        });
        return {
          message: response.response?.message ?? '',
          conversationId: response.conversation_id,
        };
      } finally {
        signal?.removeEventListener('abort', abort);
        clearTimeout(timeout);
      }
    },
    [http, connectorId]
  );

  return {
    connectorId,
    connectorName,
    hasConnector: connectorId !== '',
    isConnectorLoading,
    converse,
  };
};

export interface UseConverseOnceResult {
  /** Currently selected connector identity, for generation availability and scope checks. */
  connectorId: string;
  isConnectorLoading: boolean;
  generate: (input: string) => void;
  result: string | undefined;
  isGenerating: boolean;
  error: string | undefined;
  /** Epoch ms when the current result finished generating; undefined until done. */
  generatedAt: number | undefined;
  /** Human-readable connector name behind the generation (for provenance). */
  connectorName: string;
  reset: () => void;
}

/**
 * One-shot generation state machine over {@link useConverseApi} for surfaces
 * like "Run Full Analysis" / "Generate AI insight" buttons.
 */
export const useConverseOnce = (): UseConverseOnceResult & { hasConnector: boolean } => {
  const {
    converse,
    hasConnector,
    connectorId,
    connectorName: availableConnectorName,
    isConnectorLoading,
  } = useConverseApi();
  const { notifications } = useKibana().services;
  const [result, setResult] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [generatedAt, setGeneratedAt] = useState<number | undefined>(undefined);
  const [generationConnectorName, setGenerationConnectorName] = useState<string | undefined>();
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController>();

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
    },
    []
  );

  const generate = useCallback(
    (input: string) => {
      const requestId = ++requestIdRef.current;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setGenerationConnectorName(availableConnectorName);
      setResult(undefined);
      setGeneratedAt(undefined);
      setIsGenerating(true);
      setError(undefined);
      converse(input, undefined, abortController.signal)
        .then((converseResult) => {
          if (requestIdRef.current !== requestId) return;
          setResult(converseResult.message);
          setGeneratedAt(Date.now());
        })
        .catch((converseError: Error) => {
          if (requestIdRef.current !== requestId) return;
          const message = converseError?.message ?? String(converseError);
          setError(message);
          notifications.toasts.addDanger({ title: message });
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          abortControllerRef.current = undefined;
          setIsGenerating(false);
        });
    },
    [converse, availableConnectorName, notifications.toasts]
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
    setGenerationConnectorName(undefined);
    setResult(undefined);
    setError(undefined);
    setGeneratedAt(undefined);
    setIsGenerating(false);
  }, []);

  return {
    generate,
    result,
    isGenerating,
    error,
    generatedAt,
    connectorId,
    connectorName: generationConnectorName ?? availableConnectorName,
    isConnectorLoading,
    reset,
    hasConnector,
  };
};
