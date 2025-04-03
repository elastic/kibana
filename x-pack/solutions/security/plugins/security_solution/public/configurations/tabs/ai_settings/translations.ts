/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Tabs
export const CONVERSATIONS = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.conversations',
  { defaultMessage: 'Conversations' }
);

export const CONNECTORS = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.connectors',
  { defaultMessage: 'Connectors' }
);

export const SYSTEM_PROMPTS = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.systemPrompts',
  { defaultMessage: 'System prompts' }
);

export const QUICK_PROMPTS = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.quickPrompts',
  { defaultMessage: 'Quick prompts' }
);

export const ANONYMIZATION = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.anonymization',
  { defaultMessage: 'Anonymization' }
);

export const KNOWLEDGE_BASE = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.subNav.knowledgeBase',
  { defaultMessage: 'Knowledge base' }
);

// Settings
export const SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.settings.title',
  { defaultMessage: 'Settings' }
);

export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.settings.description',
  {
    defaultMessage:
      'To use Elastic AI Assistant, you must set up a connector to an external large language model.',
  }
);

export const SETTINGS_MANAGE_CONNECTORS = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.settings.manageConnectors',
  { defaultMessage: 'Manage connectors' }
);

// Search Connectors
export const SEARCH_CONNECTORS_TITLE = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.searchConnectors.title',
  { defaultMessage: 'Search connectors' }
);

export const SEARCH_CONNECTORS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.configurations.tabs.ai_settings.searchConnectors.description',
  {
    defaultMessage: 'Use search connectors to add knowledge to the Knowledge Base.',
  }
);
