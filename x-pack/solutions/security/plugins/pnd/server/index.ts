/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { PndConfig } from './config';
import type {
  PndPluginSetup,
  PndPluginStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';

export type { PndPluginSetup, PndPluginStart } from './types';

export const plugin: PluginInitializer<
  PndPluginSetup,
  PndPluginStart,
  PndSetupDependencies,
  PndStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<PndConfig>) => {
  const { PndPlugin } = await import('./plugin');
  return new PndPlugin(pluginInitializerContext);
};

export { config } from './config';
