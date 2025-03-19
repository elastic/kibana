/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkchatIntegrationDefinition } from '@kbn/wci-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export interface WorkChatAppPluginSetup {
  integrations: {
    register: (integration: WorkchatIntegrationDefinition) => void;
  };
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginStart {}

export interface WorkChatAppPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export interface WorkChatAppPluginStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}
