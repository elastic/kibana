/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { DetectionEngineConfig } from './config';

export { config } from './config';

/** Lazy, so the engine's modules load only when the plugin is enabled. */
export async function plugin(initializerContext: PluginInitializerContext<DetectionEngineConfig>) {
  const { DetectionEnginePlugin } = await import('./plugin');
  return new DetectionEnginePlugin(initializerContext);
}

export type { DetectionEngineRouteRepository } from './routes';
