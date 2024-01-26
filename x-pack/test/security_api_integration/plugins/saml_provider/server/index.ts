/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, Plugin } from '@kbn/core/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  cloud?: CloudSetup;
}

export const plugin: PluginInitializer<void, void, PluginSetupDependencies> = async (
  context
): Promise<Plugin> => ({
  setup: (core, plugins: PluginSetupDependencies) => initRoutes(context, core, plugins),
  start: () => {},
  stop: () => {},
});
