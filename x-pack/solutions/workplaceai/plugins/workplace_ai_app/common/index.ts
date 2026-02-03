/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENT_BUILDER_API_PATH,
  GET_AGENTS_ROUTE,
  MCP_SERVER_PATH,
  AGENT_BUILDER_AGENT_NEW_PATH,
  AGENT_BUILDER_CONVERSATIONS_NEW_PATH,
  AGENT_BUILDER_AGENTS,
  STACK_CONNECTORS_MANAGEMENT_ID,
  EARS_API_PATH,
  EARS_START_OAUTH_ROUTE,
  EARS_FETCH_SECRETS_ROUTE,
} from './routes';

export {
  EarsOAuthProvider,
  ALL_EARS_OAUTH_PROVIDERS,
  startOAuthResponseSchema,
  fetchSecretsResponseSchema,
} from './http_api/ears';

export type {
  StartOAuthRequest,
  StartOAuthResponse,
  FetchSecretsResponse,
  GoogleUserInfo,
} from './http_api/ears';
