/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  LoggerFactory,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import { registerTypes } from './saved_objects';
import type { InternalServices } from './services/types';
import { ConversationServiceImpl } from './services';
import { AgentFactory } from './services/orchestration';

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
  private readonly logger: LoggerFactory;
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger;
  }

  public setup(core: CoreSetup, pluginsDependencies: WorkChatAppPluginSetupDependencies) {
    const router = core.http.createRouter();
    registerRoutes({
      router,
      logger: this.logger.get('routes'),
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before #start');
        }
        return this.services;
      },
    });

    registerTypes({ savedObjects: core.savedObjects });

    return {};
  }

  public start(core: CoreStart, pluginsDependencies: WorkChatAppPluginStartDependencies) {
    const conversationService = new ConversationServiceImpl({
      savedObjects: core.savedObjects,
      security: pluginsDependencies.security,
      logger: this.logger.get('services.conversations'),
    });

    const agentFactory = new AgentFactory({
      inference: pluginsDependencies.inference,
      logger: this.logger.get('services.agentFactory'),
    });

    this.services = {
      conversationService,
      agentFactory,
    };

    return {};
  }
}
