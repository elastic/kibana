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
import type {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW_ID,
  SDLC_RELEASE_CALENDAR_SYNC_WORKFLOW_ID,
  SDLC_SETUP_INDICES_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SDLC_INTEL_MANAGED_WORKFLOW_OWNER } from '../common/constants';
import { registerSdlcReadRoutes } from './routes/register_routes';
import { registerSdlcWorkflowSteps } from './steps/register_workflow_steps';
import { setSdlcIntelServices } from './services/sdlc_intel_services';

export interface SdlcIntelPluginSetup {}
export interface SdlcIntelPluginStart {}

export interface SdlcIntelPluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  actions: ActionsPluginSetupContract;
}

export interface SdlcIntelPluginStartDeps {
  actions: ActionsPluginStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export class SdlcIntelPlugin
  implements
    Plugin<
      SdlcIntelPluginSetup,
      SdlcIntelPluginStart,
      SdlcIntelPluginSetupDeps,
      SdlcIntelPluginStartDeps
    >
{
  private readonly logger: Logger;
  private actionsSetup: ActionsPluginSetupContract | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SdlcIntelPluginSetupDeps): SdlcIntelPluginSetup {
    this.actionsSetup = plugins.actions;
    registerSdlcWorkflowSteps(plugins.workflowsExtensions);
    plugins.workflowsExtensions.registerManagedWorkflowOwner(SDLC_INTEL_MANAGED_WORKFLOW_OWNER);
    registerSdlcReadRoutes(core.http.createRouter(), this.logger);
    return {};
  }

  public start(core: CoreStart, plugins: SdlcIntelPluginStartDeps): SdlcIntelPluginStart {
    if (!this.actionsSetup) {
      throw new Error('sdlcIntel: actions plugin setup contract is not available');
    }

    setSdlcIntelServices({
      actionsSetup: this.actionsSetup,
      actionsStart: plugins.actions,
      coreStart: core,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      logger: this.logger,
      spaces: plugins.spaces,
    });

    void this.installManagedWorkflows(plugins.workflowsExtensions);
    return {};
  }

  public stop() {}

  private async installManagedWorkflows(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart
  ): Promise<void> {
    try {
      const client = await workflowsExtensions.initManagedWorkflowsClient(
        SDLC_INTEL_MANAGED_WORKFLOW_OWNER
      );

      await client.install(SDLC_SETUP_INDICES_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
      await client.install(SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
      await client.install(SDLC_RELEASE_CALENDAR_SYNC_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });

      await client.ready();
      this.logger.info('sdlcIntel: managed SDLC workflows installed');
    } catch (error) {
      this.logger.warn(
        `sdlcIntel: failed to install managed workflows: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new SdlcIntelPlugin(initializerContext);
