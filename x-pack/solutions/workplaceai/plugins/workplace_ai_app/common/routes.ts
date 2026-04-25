/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_BUILDER_API_PATH = '/api/agent_builder';
export const GET_AGENTS_ROUTE = `${AGENT_BUILDER_API_PATH}/agents`;
export const AGENT_BUILDER_AGENTS = 'agents';
export const MCP_SERVER_PATH = `${AGENT_BUILDER_API_PATH}/mcp`;
export const AGENT_BUILDER_AGENT_NEW_PATH = '/agents/new';
export const AGENT_BUILDER_CONVERSATIONS_NEW_PATH = '/conversations/new';

// Stack Management deeplinks
export const STACK_CONNECTORS_MANAGEMENT_ID = 'management:triggersActionsConnectors';

// EARS OAuth routes
export const EARS_API_PATH = '/internal/workplace_ai/ears';
export const EARS_START_OAUTH_ROUTE = `${EARS_API_PATH}/{provider}/oauth/start`;
export const EARS_EXCHANGE_CODE_ROUTE = `${EARS_API_PATH}/{provider}/oauth/token`;
export const EARS_REFRESH_TOKEN_ROUTE = `${EARS_API_PATH}/{provider}/oauth/refresh`;
export const EARS_REVOKE_TOKEN_ROUTE = `${EARS_API_PATH}/{provider}/oauth/revoke`;
