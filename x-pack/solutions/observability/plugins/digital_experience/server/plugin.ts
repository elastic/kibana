/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  Logger,
  PluginInitializerContext,
  Plugin as PluginType,
} from '@kbn/core/server';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { DigitalExperienceConfig } from './config';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
import { registerSessionsTask } from './services/sessions/sessions_task';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
  /** Optional: only the Classic RUM source (stateful) needs it. */
  apmDataAccess?: ApmDataAccessPluginSetup;
  /** Optional: only its presence is read, as the Classic RUM source needs it. */
  ux?: unknown;
  /** Optional: it runs the summaries task, so sessions need it. */
  taskManager?: TaskManagerSetupContract;
  /** Optional: without it, or without an encryption key, the task's API key can't be stored. */
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
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

  public setup(core: CoreSetup<DigitalExperienceStartDeps>, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);

    const { taskManager, encryptedSavedObjects } = plugins;
    const canEncrypt = encryptedSavedObjects?.canEncrypt === true;
    if (taskManager && encryptedSavedObjects) {
      // Task Manager stores the summaries task's API key encrypted.
      taskManager.registerCanEncryptedSavedObjects(encryptedSavedObjects.canEncrypt);
    }

    const { buildFlavor } = this.initializerContext.env.packageInfo;
    registerRoutes({
      core,
      logger: this.logger,
      repository: getGlobalDigitalExperienceServerRouteRepository(),
      dependencies: {
        plugins: { apmDataAccess: plugins.apmDataAccess },
        isServerless: buildFlavor === 'serverless',
        isUxEnabled: plugins.ux !== undefined,
        sessionsSettings: this.config.sessions,
        getSessionsServices: async () => {
          const [, pluginsStart] = await core.getStartServices();
          return { taskManager: pluginsStart.taskManager, canEncrypt };
        },
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });

    if (taskManager) {
      registerSessionsTask({ core, logger: this.logger, taskManager });
    }
  }

  public start() {}

  public stop() {}
}
