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
import {
  IntegrationsService,
  ConversationServiceImpl,
  AgentFactory,
  ChatService,
} from './services';
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

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies>,
    pluginsDependencies: WorkChatAppPluginSetupDependencies
  ) {
    const router = core.http.createRouter();
    registerRoutes({
      core,
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
    const { wciSalesforce } = pluginsDependencies;

    const integrationsService = new IntegrationsService({
      logger: this.logger.get('services.integrations'),
      integrationPlugins: [wciSalesforce.integration],
      elasticsearch: core.elasticsearch,
    });

    const conversationService = new ConversationServiceImpl({
      savedObjects: core.savedObjects,
      security: core.security,
      logger: this.logger.get('services.conversations'),
    });

    const agentFactory = new AgentFactory({
      inference: pluginsDependencies.inference,
      logger: this.logger.get('services.agentFactory'),
      integrationsService,
    });

    const chatService = new ChatService({
      inference: pluginsDependencies.inference,
      logger: this.logger.get('services.chat'),
      agentFactory,
      conversationService,
    });

    this.services = {
      conversationService,
      agentFactory,
      integrationsService,
      chatService,
    };

    return {};
  }
}
