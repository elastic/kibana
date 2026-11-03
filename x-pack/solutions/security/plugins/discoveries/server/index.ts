/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type { DiscoveriesPluginSetup, DiscoveriesPluginStart } from './types';
export { DEFAULT_CONNECTOR_TIMEOUT_MS, DEFAULT_ROUTE_HANDLER_TIMEOUT_MS, config } from './config';

export const plugin = async (context: PluginInitializerContext) => {
  const logger = context.logger.get();
  logger.debug(() => 'discoveries: Plugin factory function called - creating plugin instance');
  const { DiscoveriesPlugin } = await import('./plugin');
  return new DiscoveriesPlugin(context);
};
