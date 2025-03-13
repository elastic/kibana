/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import type { WorkChatIntegration } from '@kbn/wci-common';

export type IntegrationWithMeta = WorkChatIntegration & {
  id: string;
};

export type IntegrationToolInputSchema = Tool['inputSchema'];

export interface IntegrationTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}
