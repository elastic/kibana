/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { NightshiftSourcesPlugin } = await import('./plugin');
  return new NightshiftSourcesPlugin(initializerContext);
}

export type {
  GetSourcesClient,
  NightshiftSourcesServerSetup,
  NightshiftSourcesServerStart,
} from './types';

export type { SourcesClient } from './lib/sources_client';

export type { NightshiftSourcesRouteRepository } from './routes';
