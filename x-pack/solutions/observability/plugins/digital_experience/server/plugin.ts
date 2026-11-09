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
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { DigitalExperienceConfig } from './config';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
import {
  SessionsApiKeys,
  sessionsApiKeyEncryptionParams,
  sessionsApiKeySavedObjectType,
} from './sessions/sessions_api_key';
import {
  getLastAutoUpdateState,
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
  /** Optional: without it, or without an encryption key, sessions need manual updates. */
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
}

interface DigitalExperienceStartDeps {
  taskManager?: TaskManagerStartContract;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
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

    core.savedObjects.registerType(sessionsApiKeySavedObjectType);
    plugins.encryptedSavedObjects?.registerType(sessionsApiKeyEncryptionParams);
    const sessionsApiKeys = new SessionsApiKeys({
      logger: this.logger,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      hasTaskManager: plugins.taskManager !== undefined,
      getStartServices: async () => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        return { core: coreStart, encryptedSavedObjects: pluginsStart.encryptedSavedObjects };
      },
    });

    const { buildFlavor } = this.initializerContext.env.packageInfo;
    const settings = this.config.sessions;
    registerRoutes({
      core,
      logger: this.logger,
      repository: getGlobalDigitalExperienceServerRouteRepository(),
      dependencies: {
        plugins: { apmDataAccess: plugins.apmDataAccess },
        isServerless: buildFlavor === 'serverless',
        isUxEnabled: plugins.ux !== undefined,
        sessionsSettings: settings,
        sessionsApiKeys,
        getSessionsAutoUpdateState: async () => {
          const [, { taskManager }] = await core.getStartServices();
          return taskManager ? getLastAutoUpdateState(taskManager, this.logger) : {};
        },
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });

    if (plugins.taskManager) {
      registerSessionsHealthTask({
        core,
        logger: this.logger,
        taskManager: plugins.taskManager,
        settings,
        apiKeys: sessionsApiKeys,
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
