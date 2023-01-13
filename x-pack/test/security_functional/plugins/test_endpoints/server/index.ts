/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, Plugin, CoreSetup } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  taskManager: TaskManagerSetupContract;
}

export interface PluginStartDependencies {
  taskManager: TaskManagerStartContract;
}

export const plugin: PluginInitializer<void, void> = (
  initializerContext
): Plugin<void, void, PluginSetupDependencies, PluginStartDependencies> => ({
  setup: (core: CoreSetup<PluginStartDependencies>) => initRoutes(initializerContext, core),
  start: () => {},
  stop: () => {},
});
