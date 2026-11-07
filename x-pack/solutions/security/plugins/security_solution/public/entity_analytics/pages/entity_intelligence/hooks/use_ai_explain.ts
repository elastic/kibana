/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useConverseOnce } from './use_converse_api';
import { parseAiExplain } from '../ai_explain';
import type { AiExplainResult } from '../ai_explain';

export interface UseAiExplainResult {
  /** Sends a fully-assembled prompt to the Agent Builder converse endpoint. */
  explain: (prompt: string) => void;
  /** Parsed structured result once generation completes (undefined until then). */
  result: AiExplainResult | undefined;
  /** Raw model text (for the "full response" accordion / fallback rendering). */
  rawResult: string | undefined;
  isGenerating: boolean;
  error: string | undefined;
  /** False when no AI connector is configured for the space. */
  hasConnector: boolean;
  /** Human-readable connector name behind the generation, for provenance. */
  connectorName: string;
  reset: () => void;
}

/**
 * Shared "AI explain" machinery for the Explorer graph and causal timeline.
 * Thin wrapper over {@link useConverseOnce} (the existing Agent Builder converse
 * path) that parses the model's labeled-line reply into the structured
 * {@link AiExplainResult} the UI renders as graphics. Graph and timeline reuse
 * this hook with different prompt payloads built by the pure prompt builders.
 */
export const useAiExplain = (): UseAiExplainResult => {
  const {
    generate,
    result: rawResult,
    isGenerating,
    error,
    hasConnector,
    connectorName,
    reset,
  } = useConverseOnce();

  const explain = useCallback((prompt: string) => generate(prompt), [generate]);

  const result = useMemo(() => (rawResult ? parseAiExplain(rawResult) : undefined), [rawResult]);

  return {
    explain,
    result,
    rawResult,
    isGenerating,
    error,
    hasConnector,
    connectorName,
    reset,
  };
};
