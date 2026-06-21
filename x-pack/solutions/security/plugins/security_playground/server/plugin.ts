/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerProvisionRoutes } from './routes/provision';
import type {
  SecurityPlaygroundSetupPlugins,
  SecurityPlaygroundStartPlugins,
  SecurityPlaygroundSetupContract,
  SecurityPlaygroundStartContract,
} from './types';

export class SecurityPlaygroundPlugin
  implements
    Plugin<
      SecurityPlaygroundSetupContract,
      SecurityPlaygroundStartContract,
      SecurityPlaygroundSetupPlugins,
      SecurityPlaygroundStartPlugins
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<SecurityPlaygroundStartPlugins>): SecurityPlaygroundSetupContract {
    const router = core.http.createRouter();
    registerProvisionRoutes(router, core, this.logger);
    this.logger.debug('Security Playground plugin setup complete');
  }

  public start(
    _core: CoreStart,
    _plugins: SecurityPlaygroundStartPlugins
  ): SecurityPlaygroundStartContract {}

  public stop() {}
}
