/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';
import { configSchema } from './config_schema';

export const config: PluginConfigDescriptor = {
  schema: configSchema,
};
export async function plugin(initializerContext: PluginInitializerContext) {
  const { ElasticAssistantPlugin } = await import('./plugin');
  return new ElasticAssistantPlugin(initializerContext);
}

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
    name: 'Saved Attack discoveries',
    description: 'Experimental feature that allows users to save attack discoveries',
    tags: ['attack-discovery', 'elastic-assistant'],
    variationType: 'boolean',
    variations: [
      {
        name: 'On',
        description: 'Enables saved attack discoveries',
        value: true,
      },
      {
        name: 'Off',
        description: 'Disables saved attack discoveries',
        value: false,
      },
    ],
  },
];

export type {
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStartDependencies,
  AssistantTool,
  AssistantToolParams,
} from './types';
