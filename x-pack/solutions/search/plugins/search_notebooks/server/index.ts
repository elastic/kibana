/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

export async function plugin(context: PluginInitializerContext) {
  const { SearchNotebooksPlugin } = await import('./plugin');
  return new SearchNotebooksPlugin(context);
}

/** @public */
export type { SearchNotebooksPluginSetup, SearchNotebooksPluginStart } from './types';
