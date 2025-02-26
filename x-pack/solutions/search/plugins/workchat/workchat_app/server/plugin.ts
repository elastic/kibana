/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerRoutes } from './routes';

import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, pluginsDependencies: WorkChatAppPluginSetupDependencies) {
    const router = core.http.createRouter();
    registerRoutes({ router });

    return {};
  }

  public start(core: CoreStart, pluginsDependencies: WorkChatAppPluginStartDependencies) {
    return {};
  }
}
