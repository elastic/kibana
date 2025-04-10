/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'elasticAssistant';
export const PLUGIN_NAME = 'elasticAssistant';

export const BASE_PATH = '/internal/elastic_assistant';

export const CONVERSATIONS_TABLE_MAX_PAGE_SIZE = 100;
export const ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE = 100;
export const PROMPTS_TABLE_MAX_PAGE_SIZE = 100;

// Knowledge Base
export const KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE = 100;

// Capabilities
export const CAPABILITIES = `${BASE_PATH}/capabilities`;

/**
 Licensing requirements
 */
export const MINIMUM_AI_ASSISTANT_LICENSE = 'enterprise' as const;

export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;
