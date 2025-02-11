/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';

export { config, type ObservabilityOnboardingConfig } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ObservabilityOnboardingPlugin } = await import('./plugin');
  return new ObservabilityOnboardingPlugin(initializerContext);
}

export type {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart,
} from './types';
