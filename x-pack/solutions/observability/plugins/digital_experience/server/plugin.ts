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
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DigitalExperienceLocatorDefinition } from '../common/locator';
import type { DigitalExperienceConfig } from './config';
import { describeError } from './lib/helpers/errors';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';
import { savedViewSavedObjectType } from './saved_objects/saved_view';
import { SESSIONS_PLATFORMS } from './services/sessions/sessions_platforms';
import { createSessionsSetUpBackoff } from './services/sessions/sessions_set_up_backoff';
import { registerSessionsTask } from './services/sessions/sessions_task';
import { getScorecardReportStepDefinition } from './step_types/get_scorecard_report_step';

const MANAGED_WORKFLOW_OWNER = 'digitalExperience';

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
  /** Optional: the scorecard step and managed reports are only registered where Workflows is. */
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  /** Optional: manages schedule enablement, execution history, and email connectors. */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

interface DigitalExperienceStartDeps {
  taskManager?: TaskManagerStartContract;
  /** Optional: checks the manage sessions privilege in all spaces. */
  security?: SecurityPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

export class Plugin
  implements PluginType<void, void, DigitalExperienceSetupDeps, DigitalExperienceStartDeps>
{
  private readonly logger: Logger;
  private readonly config: DigitalExperienceConfig;
  private managedWorkflowsClientPromise?: Promise<PluginScopedManagedWorkflowsApi>;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<DigitalExperienceConfig>();
  }

  private getManagedWorkflowsClient(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart
  ): Promise<PluginScopedManagedWorkflowsApi> {
    if (!this.managedWorkflowsClientPromise) {
      this.managedWorkflowsClientPromise = workflowsExtensions
        .initManagedWorkflowsClient(MANAGED_WORKFLOW_OWNER)
        .catch((error) => {
          this.managedWorkflowsClientPromise = undefined;
          throw error;
        });
    }
    return this.managedWorkflowsClientPromise;
  }

  public setup(core: CoreSetup<DigitalExperienceStartDeps>, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);
    // Always registered, not behind a setting, so the saved objects check sees the type.
    core.savedObjects.registerType(savedViewSavedObjectType);
    // A short URL names its locator, and the server looks it up to create one.
    plugins.share.url.locators.create(new DigitalExperienceLocatorDefinition());

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(MANAGED_WORKFLOW_OWNER);
    plugins.workflowsExtensions?.registerStepDefinition(
      getScorecardReportStepDefinition(this.logger, async () => {
        const [, pluginsStart] = await core.getStartServices();
        return pluginsStart.security?.authz;
      })
    );

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
        sessionsSetUpBackoff: createSessionsSetUpBackoff(),
        getSessionsServices: async () => {
          const [, pluginsStart] = await core.getStartServices();
          return {
            taskManager: pluginsStart.taskManager,
            canEncrypt,
            authz: pluginsStart.security?.authz,
          };
        },
        getScheduledReportsServices: async () => {
          const [, pluginsStart] = await core.getStartServices();
          const { workflowsExtensions } = pluginsStart;
          return {
            workflowsExtensions,
            workflowsManagement: plugins.workflowsManagement?.management,
            getManagedWorkflowsClient: async () =>
              workflowsExtensions ? this.getManagedWorkflowsClient(workflowsExtensions) : undefined,
          };
        },
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });

    if (taskManager) {
      SESSIONS_PLATFORMS.forEach((platform) =>
        registerSessionsTask({
          platform,
          core,
          logger: this.logger,
          taskManager,
          settings: this.config.sessions,
        })
      );
    }
  }

  public start(_core: CoreStart, plugins: DigitalExperienceStartDeps) {
    if (plugins.workflowsExtensions) {
      // Signals startup completion so Workflows runs auto-upgrades for dynamic report instances.
      void this.getManagedWorkflowsClient(plugins.workflowsExtensions)
        .then((client) => client.ready())
        .catch((error) => {
          this.logger.warn(
            `Could not initialize Digital Experience managed workflows: ${describeError(error)}`
          );
        });
    }
  }

  public stop() {}
}
