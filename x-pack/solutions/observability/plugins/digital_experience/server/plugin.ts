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
  PluginInitializerContext,
  Plugin as PluginType,
} from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { registerDigitalExperienceFeature } from './register_feature';
import { registerSessionsRoutes } from './routes/sessions_routes';
import {
  registerSessionsHealthTask,
  scheduleSessionsHealthTask,
} from './sessions/sessions_health_task';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
}

interface DigitalExperienceStartDeps {
  taskManager?: TaskManagerStartContract;
}

export class Plugin
  implements PluginType<void, void, DigitalExperienceSetupDeps, DigitalExperienceStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);
    registerSessionsRoutes({ router: core.http.createRouter(), logger: this.logger });
    if (plugins.taskManager) {
      registerSessionsHealthTask({ core, logger: this.logger, taskManager: plugins.taskManager });
    }
  }

  public start(_core: CoreStart, plugins: DigitalExperienceStartDeps) {
    if (plugins.taskManager) {
      void scheduleSessionsHealthTask({ logger: this.logger, taskManager: plugins.taskManager });
    }
  }

  public stop() {}
}
