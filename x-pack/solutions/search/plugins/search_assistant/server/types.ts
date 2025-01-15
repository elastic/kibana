/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityAIAssistantServerStart } from '@kbn/observability-ai-assistant-plugin/server';
import { ServerlessPluginStart } from '@kbn/serverless/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginStart {}

export interface SearchAssistantPluginStartDependencies {
  observabilityAIAssistant: ObservabilityAIAssistantServerStart;
  serverless?: ServerlessPluginStart;
}
