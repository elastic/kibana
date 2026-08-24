/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import { ATTACK_DISCOVERY_CONFIDENCE_ENABLED_FEATURE_FLAG } from '@kbn/discoveries/impl/lib/helpers/is_confidence_enabled';

export type { DiscoveriesPluginSetup, DiscoveriesPluginStart } from './types';

/**
 * Feature flag definitions registered by this plugin. Core discovers this named
 * export from the plugin's server entry. `attackDiscoveryConfidenceEnabled`
 * gates Attack Discovery confidence scoring; it is independent of
 * `attackDiscoveryWorkflowsEnabled` and defaults to OFF so it can be
 * dark-launched additively.
 */
export const featureFlags: FeatureFlagDefinitions = [
  {
    key: ATTACK_DISCOVERY_CONFIDENCE_ENABLED_FEATURE_FLAG,
    name: 'Attack Discovery confidence scoring',
    description:
      'When enabled, Attack Discovery annotates each generated discovery with a calibrated confidence score (how sure the discovery is real). When disabled, the confidence workflow step is a no-op and discoveries are unchanged.',
    tags: ['security', 'attack-discovery', 'genai'],
    variationType: 'boolean',
    variations: [
      {
        name: 'Enabled',
        description: 'Confidence scoring runs and annotates discoveries',
        value: true,
      },
      {
        name: 'Disabled',
        description: 'Confidence scoring is a no-op; discoveries are unchanged',
        value: false,
      },
    ],
  },
];

/**
 * Default timeout for LLM connector calls in milliseconds.
 * This controls how long we wait for the LLM to respond before timing out.
 * Default: 10 minutes
 */
export const DEFAULT_CONNECTOR_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Default timeout for the generation route handler in milliseconds.
 * This controls how long the HTTP route can remain open before timing out.
 * Default: 10 minutes
 */
export const DEFAULT_ROUTE_HANDLER_TIMEOUT_MS = 10 * 60 * 1000;

// Config schema is required for all plugins
const configSchema = schema.object({
  connectorTimeout: schema.number({ defaultValue: DEFAULT_CONNECTOR_TIMEOUT_MS }),
  enabled: schema.boolean({ defaultValue: true }),
  langSmithApiKey: schema.maybe(schema.string()),
  langSmithProject: schema.maybe(schema.string()),
});

export const config: PluginConfigDescriptor = {
  schema: configSchema,
};

export const plugin = async (context: PluginInitializerContext) => {
  const logger = context.logger.get();
  logger.debug(() => 'discoveries: Plugin factory function called - creating plugin instance');
  const { DiscoveriesPlugin } = await import('./plugin');
  return new DiscoveriesPlugin(context);
};
