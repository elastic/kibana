/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { useRef, useCallback, useState, useMemo } from 'react';
import {
  MessageRole,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useChatService } from './use_chat_service';

interface UsePageSummaryProps {
  onSuccess?: (summary: string) => void;
  onChunk?: (chunk: string) => void;
  isLoading?: boolean;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}

export const usePageSummary = ({
  onSuccess,
  onChunk,
  observabilityAIAssistant,
}: UsePageSummaryProps = {}) => {
  const [errors, setErrors] = useState<Error[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
                'Create a 3 sentence summary of the key information and insights from the current page. Be sure to include details that would be relevant to analyse in the context of an investigation. Reference this page generally and avoid referring to a specific user.',
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
          }
          if (result.type === 'chatCompletionChunk' && result.message.content) {
            setIsLoading(false);
            onChunk?.(result.message.content);
          }
        },
        error: (error: Error) => {
          setErrors((prevErrors) => [...prevErrors, error]);
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
  ]);

  return {
    summary,
    setSummary,
    abortController: abortControllerRef.current,
    screenContexts: formattedScreenContexts,
    generateSummary,
    isObsAIAssistantEnabled: Boolean(isObsAIAssistantEnabled),
    isLoading,
    errors,
  };
};
