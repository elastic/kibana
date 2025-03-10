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
import type { InternalServices } from './services/types';
import { AgentFactory } from './services/orchestration';

import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';
import { IntegrationsService } from './services';

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

    return {};
  }

  public start(core: CoreStart, pluginsDependencies: WorkChatAppPluginStartDependencies) {

    const { wciSalesforce, wciCustomIndex } = pluginsDependencies;

    const integrationsService = new IntegrationsService({
      logger: this.logger.get('services.integrationsService'),
      integrationPlugins: [
        wciSalesforce.integration,
        wciCustomIndex.integration
      ]
    });

    const agentFactory = new AgentFactory({
      inference: pluginsDependencies.inference,
      logger: this.logger.get('services.agentFactory'),
      integrationsService,
    });

    this.services = {
      agentFactory,
      integrationsService,
    };

    return {};
  }
}
