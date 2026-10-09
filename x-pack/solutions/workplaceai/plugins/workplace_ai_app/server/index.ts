/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { WorkplaceAIAppPlugin } = await import('./plugin');
  return new WorkplaceAIAppPlugin(initializerContext);
};

export type { WorkplaceAIAppPluginSetup, WorkplaceAIAppPluginStart } from './types';
