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
import { registerFeatures } from './features';
import type { InternalServices } from './services/types';
import { createServices } from './services/create_services';
import type { WorkplaceAIAppConfig } from './config';
import { AppLogger } from './utils';
import { registerWorkplaceAIDataTypes } from './data_types';
import type {
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  WorkplaceAIAppPluginSetupDependencies,
  WorkplaceAIAppPluginStartDependencies,
} from './types';

export class WorkplaceAIAppPlugin
  implements
    Plugin<
      WorkplaceAIAppPluginSetup,
      WorkplaceAIAppPluginStart,
      WorkplaceAIAppPluginSetupDependencies,
      WorkplaceAIAppPluginStartDependencies
    >
{
  private readonly loggerFactory: LoggerFactory;
  private readonly config: WorkplaceAIAppConfig;
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.loggerFactory = context.logger;
    AppLogger.setInstance(this.loggerFactory.get('workplaceai.app'));
    this.config = context.config.get<WorkplaceAIAppConfig>();
  }

  public setup(
    core: CoreSetup<WorkplaceAIAppPluginStartDependencies>,
    setupDeps: WorkplaceAIAppPluginSetupDependencies
  ): WorkplaceAIAppPluginSetup {
    const router = core.http.createRouter();
    registerRoutes({
      core,
      router,
      logger: this.loggerFactory.get('routes'),
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before #start');
        }
        return this.services;
      },
    });

    registerFeatures({ features: setupDeps.features });

    // Register custom data types with the data sources registry
    registerWorkplaceAIDataTypes({ dataCatalog: setupDeps.dataCatalog });

    return {};
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkplaceAIAppPluginStartDependencies
  ): WorkplaceAIAppPluginStart {
    this.services = createServices({
      core,
      config: this.config,
      loggerFactory: this.loggerFactory,
      pluginsDependencies,
    });

    return {};
  }
}
