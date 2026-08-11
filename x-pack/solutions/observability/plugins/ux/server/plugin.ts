/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { registerRoutes } from '@kbn/server-route-repository';
import type { UXConfig } from '../common/config';
import { getUxServerRouteRepository } from './routes';
import type { UxRouteHandlerResources } from './routes/types';

export class Plugin implements PluginType {
  private readonly logger: Logger;
  private readonly initContext: PluginInitializerContext<UXConfig>;

  constructor(initContext: PluginInitializerContext<UXConfig>) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const config = this.initContext.config.get();

    if (!config.sessionReplay.enabled) {
      return {};
    }

    const dependencies: Omit<UxRouteHandlerResources, keyof DefaultRouteHandlerResources> = {
      config,
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getUxServerRouteRepository(),
      dependencies,
      runDevModeChecks: this.initContext.env.mode.dev,
    });

    return {};
  }

  public start(_coreStart: CoreStart) {}

  public stop() {}
}
