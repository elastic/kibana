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

/**
 * Source data streams for one namespace. The PoC treats the space ID as the namespace, so a space
 * reads only its own events, as the Entity Store and alerts reads already do.
 */
export const getEndpointProcessIndex = (namespace: string): string =>
  `logs-endpoint.events.process-${namespace}`;
export const getEndpointFileIndex = (namespace: string): string =>
  `logs-endpoint.events.file-${namespace}`;
export const getEndpointNetworkIndex = (namespace: string): string =>
  `logs-endpoint.events.network-${namespace}`;
/** The dataset is `claude_code.events` or `claude_code.events.otel`, depending on the collector. */
export const getClaudeCodeOtelIndex = (namespace: string): string =>
  `logs-claude_code.events*-${namespace}`;
export const getOktaUserIndex = (namespace: string): string =>
  `logs-entityanalytics_okta.user-${namespace}`;
export const getEntraUserIndex = (namespace: string): string =>
  `logs-entityanalytics_entra_id.user-${namespace}`;
/**
 * The storyline's HR index (lane A generator). A made-up shape: no HR integration was looked at.
 * It isn't a data stream and has no namespace, so every space reads it.
 */
export const HR_INDEX = 'hr-workday-demo*';

export const POC_MOCK_TAG = 'poc-mock';

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
