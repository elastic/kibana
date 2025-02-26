/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';

export class SearchAssistantPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies, WorkChatAppPluginStart>
  ): WorkChatAppPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    return {};
  }

  public stop() {}
}
