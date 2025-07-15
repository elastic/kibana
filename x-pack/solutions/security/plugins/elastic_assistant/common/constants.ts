/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  SECURITY_FEATURE_ID_V2 as SECURITY_FEATURE_ID,
  CASES_FEATURE_ID_V3 as CASES_FEATURE_ID,
} from '@kbn/security-solution-features/constants';

export const PLUGIN_ID = 'elasticAssistant';
export const PLUGIN_NAME = 'elasticAssistant';

export const BASE_PATH = '/internal/elastic_assistant';

export const CONVERSATIONS_TABLE_MAX_PAGE_SIZE = 100;
export const ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE = 100;
export const PROMPTS_TABLE_MAX_PAGE_SIZE = 100;

// Event log
export const ATTACK_DISCOVERY_EVENT_PROVIDER = 'securitySolution.attackDiscovery' as const;

export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED = 'generation-started' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED =
  'generation-succeeded' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED = 'generation-failed' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED = 'generation-canceled' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED =
  'generation-dismissed' as const;

export const ATTACK_DISCOVERY_EVENT_ACTIONS = [
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
];

// Knowledge Base
export const KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE = 100;

// Capabilities
export const CAPABILITIES = `${BASE_PATH}/capabilities`;

/**
 Licensing requirements
 */
export const MINIMUM_AI_ASSISTANT_LICENSE = 'enterprise' as const;

export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;
