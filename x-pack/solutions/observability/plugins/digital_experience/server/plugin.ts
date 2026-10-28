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
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { DigitalExperienceConfig } from './config';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
import { registerSessionsRoutes } from './routes/sessions_routes';
import {
  registerSessionsHealthTask,
  scheduleSessionsHealthTask,
} from './sessions/sessions_health_task';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
  /** Optional: only the Classic RUM source (stateful) needs it. */
  apmDataAccess?: ApmDataAccessPluginSetup;
  /** Optional: only its presence is read, as the Classic RUM source needs it. */
  ux?: unknown;
  taskManager?: TaskManagerSetupContract;
}

interface DigitalExperienceStartDeps {
  taskManager?: TaskManagerStartContract;
}

export class Plugin
  implements PluginType<void, void, DigitalExperienceSetupDeps, DigitalExperienceStartDeps>
{
  private readonly logger: Logger;
  private readonly config: DigitalExperienceConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<DigitalExperienceConfig>();
  }

  public setup(core: CoreSetup, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);

    const { buildFlavor } = this.initializerContext.env.packageInfo;
    registerRoutes({
      core,
      logger: this.logger,
      repository: getGlobalDigitalExperienceServerRouteRepository(),
      dependencies: {
        plugins: { apmDataAccess: plugins.apmDataAccess },
        isServerless: buildFlavor === 'serverless',
        isUxEnabled: plugins.ux !== undefined,
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });

    const settings = this.config.sessions;
    registerSessionsRoutes({ router: core.http.createRouter(), logger: this.logger, settings });
    if (plugins.taskManager) {
      registerSessionsHealthTask({
        core,
        logger: this.logger,
        taskManager: plugins.taskManager,
        settings,
      });
    }
  }

  public start(_core: CoreStart, plugins: DigitalExperienceStartDeps) {
    if (plugins.taskManager) {
      void scheduleSessionsHealthTask({ logger: this.logger, taskManager: plugins.taskManager });
    }
  }

  public stop() {}
}
