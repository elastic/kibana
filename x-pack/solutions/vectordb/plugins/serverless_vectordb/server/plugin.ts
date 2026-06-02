/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
} from '@kbn/core/server';
import { VECTORDB_PROJECT_SETTINGS } from '@kbn/serverless-vectordb-settings';

import type { ServerlessVectordbConfig } from './config';
import { registerCreateApiKeyRoute } from './routes/api_key';
import { registerDeploymentStatsRoute } from './routes/deployment_stats';
import type {
  ServerlessVectordbPluginSetup,
  ServerlessVectordbPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export class ServerlessVectordbPlugin
  implements
    Plugin<
      ServerlessVectordbPluginSetup,
      ServerlessVectordbPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  // @ts-ignore config is not used for now
  private readonly config: ServerlessVectordbConfig;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ServerlessVectordbConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDependencies>, { serverless }: SetupDependencies) {
    serverless.setupProjectSettings(VECTORDB_PROJECT_SETTINGS);

    const router = core.http.createRouter();
    registerDeploymentStatsRoute(router, this.logger);
    registerCreateApiKeyRoute(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
