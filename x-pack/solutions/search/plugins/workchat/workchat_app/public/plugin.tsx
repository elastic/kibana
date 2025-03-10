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
import { registerApp } from './application';
import { ChatService, ConversationService, type WorkChatServices } from './services';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  private services?: WorkChatServices;

  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies, WorkChatAppPluginStart>
  ): WorkChatAppPluginSetup {
    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    return {};
  }

  public start(
    { http }: CoreStart,
    pluginsStart: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    const conversationService = new ConversationService({
      http,
    });
    const chatService = new ChatService({
      http,
    });

    this.services = {
      chatService,
      conversationService,
    };

    return {};
  }

  public stop() {}
}
