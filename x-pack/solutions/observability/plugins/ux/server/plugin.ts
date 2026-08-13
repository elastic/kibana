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
import { getUxServerRouteRepository } from './routes';
import type { UxRouteHandlerResources } from './routes/types';
import { sessionReplaySettingsSavedObjectType } from './saved_objects/session_replay_settings';

export class Plugin implements PluginType {
  private readonly logger: Logger;
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup) {
    core.savedObjects.registerType(sessionReplaySettingsSavedObjectType);

    const dependencies: Omit<UxRouteHandlerResources, keyof DefaultRouteHandlerResources> = {
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
