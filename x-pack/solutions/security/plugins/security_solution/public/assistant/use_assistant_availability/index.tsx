/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMaybeAssistantContext } from '@kbn/elastic-assistant';

export interface UseAssistantAvailability {
  // True when searchAiLake configurations is available
  hasSearchAILakeConfigurations: boolean;
  // True when user is Enterprise. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // True when the Assistant is visible, i.e. the Assistant is available and the Assistant is visible in the UI
  isAssistantVisible: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
  // When true, user has `All` privilege for `Connectors and Actions` (show/execute/delete/save ui capabilities)
  hasConnectorsAllPrivilege: boolean;
  // When true, user has `Read` privilege for `Connectors and Actions` (show/execute ui capabilities)
  hasConnectorsReadPrivilege: boolean;
  // When true, user has `Edit` privilege for `AnonymizationFields`
  hasUpdateAIAssistantAnonymization: boolean;
  // When true, user has `Edit` privilege for `Global Knowledge Base`
  hasManageGlobalKnowledgeBase: boolean;
}

const ASSISTANT_UNAVAILABLE: UseAssistantAvailability = {
  hasSearchAILakeConfigurations: false,
  isAssistantEnabled: false,
  isAssistantVisible: false,
  hasAssistantPrivilege: false,
  hasConnectorsAllPrivilege: false,
  hasConnectorsReadPrivilege: false,
  hasUpdateAIAssistantAnonymization: false,
  hasManageGlobalKnowledgeBase: false,
};

export const useAssistantAvailability = (): UseAssistantAvailability => {
  const context = useMaybeAssistantContext();
  if (context == null) {
    return ASSISTANT_UNAVAILABLE;
  }
  return context.assistantAvailability;
};
