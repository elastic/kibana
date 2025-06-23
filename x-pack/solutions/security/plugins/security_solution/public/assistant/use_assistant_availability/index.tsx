/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantAvailability } from '@kbn/elastic-assistant';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useLicense } from '../../common/hooks/use_license';
import { useKibana } from '../../common/lib/kibana';
import { ASSISTANT_FEATURE_ID, SECURITY_FEATURE_ID } from '../../../common/constants';

export const useAssistantAvailability = (): AssistantAvailability => {
  const isEnterprise = useLicense().isEnterprise();
  const capabilities = useKibana().services.application.capabilities;
  const hasAssistantPrivilege = capabilities[ASSISTANT_FEATURE_ID]?.['ai-assistant'] === true;
  const hasUpdateAIAssistantAnonymization =
    capabilities[ASSISTANT_FEATURE_ID]?.updateAIAssistantAnonymization === true;
  const hasManageGlobalKnowledgeBase =
    capabilities[ASSISTANT_FEATURE_ID]?.manageGlobalKnowledgeBaseAIAssistant === true;
  const hasSearchAILakeConfigurations = capabilities[SECURITY_FEATURE_ID]?.configurations === true;

  // Connectors & Actions capabilities as defined in x-pack/plugins/actions/server/feature.ts
  // `READ` ui capabilities defined as: { ui: ['show', 'execute'] }
  const hasConnectorsReadPrivilege =
    capabilities.actions?.show === true && capabilities.actions?.execute === true;
  // `ALL` ui capabilities defined as: { ui: ['show', 'execute', 'save', 'delete'] }
  const hasConnectorsAllPrivilege =
    hasConnectorsReadPrivilege &&
    capabilities.actions?.delete === true &&
    capabilities.actions?.save === true;

  const starterPromptsEnabled = useIsExperimentalFeatureEnabled('starterPromptsEnabled');
  // remove once product has signed off on prompt text
  const isStarterPromptsEnabled = starterPromptsEnabled;

  return {
    hasSearchAILakeConfigurations,
    hasAssistantPrivilege,
    hasConnectorsAllPrivilege,
    hasConnectorsReadPrivilege,
    isAssistantEnabled: isEnterprise,
    isStarterPromptsEnabled,
    hasUpdateAIAssistantAnonymization,
    hasManageGlobalKnowledgeBase,
  };
};
