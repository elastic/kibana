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
import {
  PND_API_PRIVILEGE_READ,
  PND_API_PRIVILEGE_WRITE,
  PND_FEATURE_ID,
  PND_PLUGIN_NAME,
} from '../common/constants';
import type { PndConfig } from './config';
import type {
  PndPluginSetup,
  PndPluginStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { WatchesService } from './services/watches/watches_service';
import { WorkersService } from './services/workers/workers_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';
import { agentType, ensureAgent, ensureAgentSafe, registerAgentType } from './agent';

export class PndPlugin
  implements Plugin<PndPluginSetup, PndPluginStart, PndSetupDependencies, PndStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: PndConfig;
  private spaces?: PndStartDependencies['spaces'];
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];

  /** Created during `start`; routes resolve them lazily after managed-workflow initialization. */
  private watchesService?: WatchesService;
  private workersService?: WorkersService;

  constructor(context: PluginInitializerContext<PndConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<PndStartDependencies, PndPluginStart>,
    { agentBuilder, features, workflowsExtensions, workflowsManagement }: PndSetupDependencies
  ): PndPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('PND plugin is disabled');
      return {};
    }

    this.logger.info('Setting up PND plugin');

    this.workflowsManagementApi = workflowsManagement.management;

    registerOwner({ workflowsExtensions });
    registerAgentType(agentBuilder);

    features.registerKibanaFeature({
      id: PND_FEATURE_ID,
      name: PND_PLUGIN_NAME,
      order: 1101,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PND_FEATURE_ID],
      privileges: {
        all: {
          app: ['kibana', PND_FEATURE_ID],
          api: [PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE],
          savedObject: { all: [], read: [] },
          ui: ['show', 'write'],
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
      getWatchesService: () => this.requireWatchesService(),
      getWorkersService: () => this.requireWorkersService(),
    });

    return {};
  }

  start(_core: CoreStart, plugins: PndStartDependencies): PndPluginStart {
    this.spaces = plugins.spaces;

    if (!this.config.enabled) {
      return {};
    }

    void ensureAgentSafe({
      agentBuilder: plugins.agentBuilder,
      spaceId: DEFAULT_SPACE_ID,
      logger: this.logger,
    });

    const management = this.workflowsManagementApi
      ? new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi)
      : undefined;
    const managedWorkflows = initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
      ensureAgentForSpace: plugins.agentBuilder
        ? (spaceId) => ensureAgent({ agentBuilder: plugins.agentBuilder!, spaceId })
        : undefined,
    }).catch((error) => {
      this.logger.error(
        `PND managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    });

    // Mock mode changes presentation data only; durable Worker settings and enablement still use Workflows.
    this.watchesService = new WatchesService();
    this.workersService = new WorkersService(management, managedWorkflows, this.logger, {
      ensureAgentForSpace: plugins.agentBuilder
        ? (spaceId) =>
            ensureAgentSafe({ agentBuilder: plugins.agentBuilder!, spaceId, logger: this.logger })
        : undefined,
      agentBuilder: plugins.agentBuilder,
      agentTypes: [agentType],
    });

    return {};
  }

  private requireWatchesService(): WatchesService {
    if (!this.watchesService) {
      throw new Error('Watches service is not available until the PND plugin has started');
    }
    return this.watchesService;
  }

  private requireWorkersService(): WorkersService {
    if (!this.workersService) {
      throw new Error('Workers service is not available until the PND plugin has started');
    }
    return this.workersService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
