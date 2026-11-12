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
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { DigitalExperienceLocatorDefinition } from '../common/locator';
import type { DigitalExperienceConfig } from './config';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
import { sessionsSettingsSavedObjectType } from './saved_objects';
import { savedViewSavedObjectType } from './saved_objects/saved_view';
import { SESSIONS_PLATFORMS } from './services/sessions/sessions_platforms';
import { createSessionsSetUpBackoff } from './services/sessions/sessions_set_up_backoff';
import { createSessionsSettingsGetter } from './services/sessions/sessions_settings';
import { registerSessionsTask } from './services/sessions/sessions_task';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
  share: SharePluginSetup;
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
  /** Optional: checks the manage sessions privilege in all spaces. */
  security?: SecurityPluginStart;
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
    // Always registered, not behind a setting, so the saved objects check sees the type.
    core.savedObjects.registerType(savedViewSavedObjectType);
    core.savedObjects.registerType(sessionsSettingsSavedObjectType);
    // A short URL names its locator, and the server looks it up to create one.
    plugins.share.url.locators.create(new DigitalExperienceLocatorDefinition());

    const { taskManager, encryptedSavedObjects } = plugins;
    const canEncrypt = encryptedSavedObjects?.canEncrypt === true;
    if (taskManager && encryptedSavedObjects) {
      // Task Manager stores the summaries task's API key encrypted.
      taskManager.registerCanEncryptedSavedObjects(encryptedSavedObjects.canEncrypt);
    }

    // kibana.yml's settings are the defaults; the ones saved in the app win.
    const getSessionsSettings = createSessionsSettingsGetter({
      core,
      defaults: this.config.sessions,
      logger: this.logger,
    });

    const { buildFlavor } = this.initializerContext.env.packageInfo;
    registerRoutes({
      core,
      logger: this.logger,
      repository: getGlobalDigitalExperienceServerRouteRepository(),
      dependencies: {
        plugins: { apmDataAccess: plugins.apmDataAccess },
        isServerless: buildFlavor === 'serverless',
        isUxEnabled: plugins.ux !== undefined,
        sessionsSettingsDefaults: this.config.sessions,
        getSessionsSettings,
        sessionsSetUpBackoff: createSessionsSetUpBackoff(),
        getSessionsServices: async () => {
          const [, pluginsStart] = await core.getStartServices();
          return {
            taskManager: pluginsStart.taskManager,
            canEncrypt,
            authz: pluginsStart.security?.authz,
          };
        },
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });

    if (taskManager) {
      // Every platform's task runs with the same settings.
      SESSIONS_PLATFORMS.forEach((platform) =>
        registerSessionsTask({
          platform,
          core,
          logger: this.logger,
          taskManager,
          getSettings: getSessionsSettings,
        })
      );
    }
  }

  public start() {}

  public stop() {}
}
