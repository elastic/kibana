/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Path of the AI security page, under the Security app. Proof of concept, behind `entityAnalyticsAiSecurityPoc`. */
export const ENTITY_ANALYTICS_AI_SECURITY_PATH = '/entity_analytics_ai_security' as const;

export const AI_SECURITY_SCOPE_ID = 'entity-analytics-ai-security';

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

export const POC_MOCK_TAG = 'poc-mock';

/** Agents read at most this many rows on the page. */
export const AI_AGENTS_MAX_ROWS = 1000;

/** The Agent activity tab and the header's session count cover this many days, ending now. */
export const SESSIONS_WINDOW_DAYS = 30;

export const ACTIVITY_MAX_PROCESS_EVENTS = 5000;
export const ACTIVITY_MAX_OTEL_EVENTS = 2000;
export const AGENT_ALERTS_MAX_ROWS = 100;

export const AI_AGENTS_QUERY_KEYS = {
  inventory: 'ai-agents-inventory',
  context: 'ai-agent-context',
  alerts: 'ai-agent-alerts',
  sessions: 'ai-agent-sessions',
  sessionDetail: 'ai-agent-session-detail',
  sessionCommands: 'ai-agent-session-commands',
} as const;
