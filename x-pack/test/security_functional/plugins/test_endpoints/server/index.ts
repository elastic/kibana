/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializer } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  security: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface PluginStartDependencies {
  security: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

export const plugin: PluginInitializer<void, void> = async (
  initializerContext
): Promise<Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>> => ({
  setup: (core: CoreSetup<PluginStartDependencies>) => initRoutes(initializerContext, core),
  start: () => {},
  stop: () => {},
});
