/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getClientForInternalServer, getClientForExternalServer } from './src/utils';
export { SSEClientTransport, type SSEClientTransportOptions } from './src/mcp/sse_client';
export type {
  IntegrationClient,
  IntegrationContext,
  WorkChatIntegration,
  WorkchatIntegrationDefinition,
} from './src/types';
