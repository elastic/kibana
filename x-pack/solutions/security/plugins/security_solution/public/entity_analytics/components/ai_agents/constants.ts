/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Path of the AI agents page, under the Security app. Proof of concept, behind `entityAnalyticsAiAgentsPoc`. */
export const ENTITY_ANALYTICS_AI_AGENTS_PATH = '/entity_analytics_ai_agents' as const;

export const AI_AGENTS_SCOPE_ID = 'entity-analytics-ai-agents';

/** Entity Store engine type of AI agent rows. */
export const AI_AGENT_ENGINE_TYPE = 'ai_agent';

export const AI_AGENT_ID_PREFIX = 'ai_agent:';

export const ENDPOINT_PROCESS_INDEX = 'logs-endpoint.events.process-*';
export const ENDPOINT_FILE_INDEX = 'logs-endpoint.events.file-*';
export const ENDPOINT_NETWORK_INDEX = 'logs-endpoint.events.network-*';
export const CLAUDE_CODE_OTEL_INDEX = 'logs-claude_code.events*';
export const IDP_USER_INDICES = 'logs-entityanalytics_okta.user-*, logs-entityanalytics_entra_id.user-*';

/** Agents read at most this many rows on the page. */
export const AI_AGENTS_MAX_ROWS = 1000;

/** Descendants of an agent can outlive it (Cursor's language server), so activity reads past its last seen. */
export const ACTIVITY_LOOKBACK_MARGIN_MS = 60_000;

export const ACTIVITY_MAX_PROCESS_EVENTS = 5000;
export const ACTIVITY_MAX_OTEL_EVENTS = 2000;
export const AGENT_ALERTS_MAX_ROWS = 100;

export const AI_AGENTS_QUERY_KEYS = {
  inventory: 'ai-agents-inventory',
  context: 'ai-agent-context',
  alerts: 'ai-agent-alerts',
  activity: 'ai-agent-activity',
} as const;
