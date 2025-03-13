/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkchatIntegrationDefinition } from '@kbn/wci-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Tool } from '@modelcontextprotocol/sdk/types';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';

export interface WorkChatAppPluginSetup {
  integrations: {
    register: (integration: WorkchatIntegrationDefinition) => void;
  };
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginSetupDependencies {}

export interface WorkChatAppPluginStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}

export type IntegrationToolInputSchema = Tool['inputSchema'];

export interface IntegrationTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}
