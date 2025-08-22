/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { v4 as uuidv4 } from 'uuid';
import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import {
  MessageRole,
  type ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useChatService } from './use_chat_service';

interface UsePageSummaryProps {
  onSuccess?: (summary: string) => void;
  onChunk?: (chunk: string) => void;
  isLoading?: boolean;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  appInstructions?: string;
}

export const usePageSummary = ({
  onSuccess,
  onChunk,
  observabilityAIAssistant,
  appInstructions,
}: UsePageSummaryProps = {}) => {
  const [errors, setErrors] = useState<Error[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const abortControllerRef = useRef(new AbortController());
  const {
    chatService,
    observabilityAIAssistantService,
    selectedConnector,
    isObsAIAssistantEnabled,
    errors: chatServiceErrors,
  } = useChatService({ observabilityAIAssistant });

  const screenContexts = observabilityAIAssistantService?.getScreenContexts();

  const formattedScreenContexts = useMemo(() => {
    return screenContexts
      ?.map((context) => ({
        screenDescription: context.screenDescription || '',
      }))
      .filter((context) => context.screenDescription);
  }, [screenContexts]);

  const generateSummary = useCallback(() => {
    if (!isObsAIAssistantEnabled) {
      setIsLoading(false);
      return;
    }
    if (
      !observabilityAIAssistantService ||
      !chatService ||
      !selectedConnector ||
      chatServiceErrors.length > 0
    ) {
      setSummary('');
      setErrors((prevErrors) => [...prevErrors, ...chatServiceErrors]);
      return;
    }
    const conversationId = uuidv4();
    setIsLoading(true);
    chatService
      .complete({
        getScreenContexts: () => observabilityAIAssistantService?.getScreenContexts(),
        conversationId,
        signal: abortControllerRef.current.signal,
        connectorId: selectedConnector,
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content:
                dedent(`Create a 1 sentence summary of the current page.  State facts directly without descriptive phrases like "shows," "indicates," or "reveals." 

                Include specific numbers, percentages, error counts, response times, exact timestamps, and locations when available.
                
                Report anomalies, spikes, drops, or failures with their precise timing and impact.

                Use both UTC and local timestamps if provided. Use the date format provided - do not convert times yourself. When both local and UTC times are available, include the local time first and the UTC time in parentheses.

                Begin immediately with the most urgent findings.

                ${
                  appInstructions
                    ? `Here are some additional instructions for the current page: ${appInstructions}.`
                    : ''
                }`),
            },
          },
        ],
        scopes: ['observability'],
        disableFunctions: true,
        persist: false,
        systemMessage:
          'You are an expert Site Reliability Engineering (SRE) assistant specialized in incident investigation and observability data analysis. You work with a senior SRE who is highly skilled at interpreting monitoring signals, metrics, logs, and traces.',
      })
      .subscribe({
        next: (result) => {
          if (result.type === 'chatCompletionMessage' && result.message.content) {
            setIsLoading(false);
            onSuccess?.(result.message.content);
            setIsComplete(true);
          }
          if (result.type === 'chatCompletionChunk' && result.message.content) {
            setIsLoading(false);
            onChunk?.(result.message.content);
          }
        },
        error: (error: Error) => {
          setErrors((prevErrors) => [...prevErrors, error]);
          setIsComplete(true);
          setIsLoading(false);
        },
      });
  }, [
    chatService,
    observabilityAIAssistantService,
    onChunk,
    isObsAIAssistantEnabled,
    onSuccess,
    selectedConnector,
    chatServiceErrors,
    appInstructions,
  ]);

  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      abortController.abort();
    };
  }, []);

  return {
    summary,
    abortController: abortControllerRef.current,
    screenContexts: formattedScreenContexts,
    generateSummary,
    isObsAIAssistantEnabled: Boolean(isObsAIAssistantEnabled),
    isLoading,
    isComplete,
    errors,
  };
};
