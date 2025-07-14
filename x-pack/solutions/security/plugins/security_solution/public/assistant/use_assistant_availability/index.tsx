/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAssistantContext } from '@kbn/elastic-assistant';

export interface UseAssistantAvailability {
  // True when searchAiLake configurations is available
  hasSearchAILakeConfigurations: boolean;
  // True when user is Enterprise. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
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

export const useAssistantAvailability = (): UseAssistantAvailability => {
  const { assistantAvailability } = useAssistantContext();
  return assistantAvailability;
};
