/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { getKubernetesPocServerRouteRepository } from './routes';

export class KubernetesPocPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.logger = this.initContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.info('kubernetesPoc: Setup');

    const dependencies = {
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getKubernetesPocServerRouteRepository(),
      dependencies,
      runDevModeChecks: this.initContext.env.mode.dev,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.info('kubernetesPoc: Started');
    return {};
  }

  public stop() {}
}
