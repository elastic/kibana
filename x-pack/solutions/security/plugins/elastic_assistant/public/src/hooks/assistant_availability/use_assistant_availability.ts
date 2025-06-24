/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAssistantAvailability } from '@kbn/elastic-assistant';
import { ASSISTANT_FEATURE_ID, SECURITY_FEATURE_ID } from '../../common/constants';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';

import { useLicense } from '../licence/use_licence';

export const useAssistantAvailability = (): UseAssistantAvailability => {
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

  return {
    hasSearchAILakeConfigurations,
    hasAssistantPrivilege,
    hasConnectorsAllPrivilege,
    hasConnectorsReadPrivilege,
    isAssistantEnabled: isEnterprise,
    hasUpdateAIAssistantAnonymization,
    hasManageGlobalKnowledgeBase,
  };
};
