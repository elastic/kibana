/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AlertZeroConfig } from './config';
import type {
  AlertZeroPluginSetup,
  AlertZeroPluginStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';

export type { AlertZeroPluginSetup, AlertZeroPluginStart } from './types';

export const plugin: PluginInitializer<
  AlertZeroPluginSetup,
  AlertZeroPluginStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<AlertZeroConfig>) => {
  const { AlertZeroPlugin } = await import('./plugin');
  return new AlertZeroPlugin(pluginInitializerContext);
};

export { config } from './config';
