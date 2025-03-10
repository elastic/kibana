/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { IntegrationPlugin, IntegrationTypes } from '@kbn/wci-common';

export interface CustomIndexIntegrationPlugin extends IntegrationPlugin {
  name: IntegrationTypes.CustomIndex;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCICustomIndexPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCICustomIndexPluginStart {
  integration: CustomIndexIntegrationPlugin;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCICustomIndexPluginSetupDependencies {}

export interface WCICustomIndexPluginStartDependencies {
  inference: InferenceServerStart;
} 