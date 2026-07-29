/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { PND_API_PRIVILEGE_READ, PND_FEATURE_ID, PND_PLUGIN_NAME } from '../common/constants';
import type { PndConfig } from './config';
import type {
  PndPluginSetup,
  PndPluginStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { installStatic } from './managed_workflows/install_static';
import { agentType, ensureAgentSafe, registerAgentType } from './agent_builder';
import type { WatchWorkflowProjectionService } from './services/watches/watch_workflow_projection_service';
import { WatchWorkflowProjectionService as WatchWorkflowProjectionServiceImpl } from './services/watches/watch_workflow_projection_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';

export class PndPlugin
  implements Plugin<PndPluginSetup, PndPluginStart, PndSetupDependencies, PndStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: PndConfig;
  private spaces?: PndStartDependencies['spaces'];
  private watchProjection?: WatchWorkflowProjectionService;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  private agentBuilder?: PndStartDependencies['agentBuilder'];

  constructor(context: PluginInitializerContext<PndConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<PndStartDependencies, PndPluginStart>,
    { features, workflowsExtensions, workflowsManagement, agentBuilder }: PndSetupDependencies
  ): PndPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('PND plugin is disabled');
      return {};
    }

    this.logger.info('Setting up PND plugin');

    this.workflowsManagementApi = workflowsManagement?.management;

    registerOwner({ workflowsExtensions });

    if (agentBuilder) {
      registerAgentType(agentBuilder);
    }

    features.registerKibanaFeature({
      id: PND_FEATURE_ID,
      name: PND_PLUGIN_NAME,
      order: 1101,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PND_FEATURE_ID],
      privileges: {
        all: {
          app: ['kibana', PND_FEATURE_ID],
          api: [PND_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
        read: {
          app: ['kibana', PND_FEATURE_ID],
          api: [PND_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
      config: this.config,
      getSpaceId: (request) => this.getSpaceId(request),
      getWatchProjection: () => this.watchProjection,
    });

    return {};
  }

  start(_core: CoreStart, plugins: PndStartDependencies): PndPluginStart {
    this.spaces = plugins.spaces;
    this.agentBuilder = plugins.agentBuilder;

    if (!this.config.enabled) {
      return {};
    }

    const installationReady = installStatic({
      enabled: this.config.enabled,
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `PND managed watch installation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    if (plugins.agentBuilder) {
      void ensureAgentSafe({
        agentBuilder: plugins.agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
        logger: this.logger,
      });
    }

    if (this.workflowsManagementApi != null) {
      const managementClient = new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi);
      this.watchProjection = new WatchWorkflowProjectionServiceImpl(
        managementClient,
        this.logger,
        installationReady,
        {
          ensureAgentForSpace: this.ensureAgentsForSpace.bind(this),
          agentBuilder: plugins.agentBuilder,
          agentTypes: [agentType],
        }
      );
    }

    return {};
  }

  private async ensureAgentsForSpace(spaceId: string): Promise<void> {
    if (!this.agentBuilder) {
      return;
    }
    await ensureAgentSafe({
      agentBuilder: this.agentBuilder,
      spaceId,
      logger: this.logger,
    });
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
