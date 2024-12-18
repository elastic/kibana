/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SecuritySolutionServerlessPlugin } = await import('./plugin');
  return new SecuritySolutionServerlessPlugin(initializerContext);
}

export type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
} from './types';
