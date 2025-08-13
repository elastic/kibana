/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import { type ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';

export const useChatService = ({
  observabilityAIAssistant,
}: {
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}) => {
  const [errors, setErrors] = useState<Error[]>([]);
  const ObservabilityAIAssistantChatServiceContext =
    observabilityAIAssistant?.ObservabilityAIAssistantChatServiceContext;
  const obsAIService = observabilityAIAssistant?.service;
  const isObsAIAssistantEnabled = Boolean(
    observabilityAIAssistant &&
      ObservabilityAIAssistantChatServiceContext &&
      obsAIService?.isEnabled()
  );
  const { connectors = [], selectedConnector } =
    observabilityAIAssistant?.useGenAIConnectors() || {};

  const chatService = useAbortableAsync(
    async ({ signal }) => {
      if (!obsAIService || !isObsAIAssistantEnabled) {
        return Promise.resolve(null);
      }
      return obsAIService.start({ signal }).catch((error: Error) => {
        setErrors((prevErrors: Error[]) => [...prevErrors, error]);
      });
    },
    [obsAIService, isObsAIAssistantEnabled]
  );

  return {
    ObservabilityAIAssistantChatServiceContext,
    chatService: chatService.value || null,
    observabilityAIAssistantService: obsAIService,
    isObsAIAssistantEnabled,
    connectors,
    selectedConnector,
    errors,
  };
};
