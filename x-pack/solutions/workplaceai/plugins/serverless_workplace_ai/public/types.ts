/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIServerlessPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIServerlessPluginStart {}

export interface WorkplaceAIServerlessPluginSetupDeps {
  serverless: ServerlessPluginSetup;
}

export interface WorkplaceAIServerlessPluginStartDeps {
  serverless: ServerlessPluginStart;
}
