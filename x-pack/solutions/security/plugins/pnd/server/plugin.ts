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
import type { WatchWorkflowProjectionService } from './services/watches/watch_workflow_projection_service';
import { WatchWorkflowProjectionService as WatchWorkflowProjectionServiceImpl } from './services/watches/watch_workflow_projection_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';
import { InvestigationStore } from './services/investigations/investigation_store';
import { PndConversationStore } from './services/investigations/pnd_conversation_store';
import { DualWriteStore } from './services/investigations/dual_write_store';
import type { PndStore } from './services/investigations/pnd_store';

export class PndPlugin
  implements Plugin<PndPluginSetup, PndPluginStart, PndSetupDependencies, PndStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: PndConfig;
  private spaces?: PndStartDependencies['spaces'];
  private watchProjection?: WatchWorkflowProjectionService;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  private investigationStore?: PndStore;
  private agentBuilder?: PndStartDependencies['agentBuilder'];

  constructor(context: PluginInitializerContext<PndConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<PndStartDependencies, PndPluginStart>,
    { features, workflowsExtensions, workflowsManagement }: PndSetupDependencies
  ): PndPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('PND plugin is disabled');
      return {};
    }

    this.logger.info('Setting up PND plugin');

    this.workflowsManagementApi = workflowsManagement?.management;

    registerOwner({ workflowsExtensions });

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
      getWorkflowsManagement: () => this.workflowsManagementApi,
      getInvestigationStore: () => this.investigationStore,
      getConversationClient: (request) =>
        this.agentBuilder && typeof this.agentBuilder.conversations?.getScopedClient === 'function'
          ? this.agentBuilder.conversations.getScopedClient({ request })
          : undefined,
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
    })
      .then(({ failedIds }) => {
        if (failedIds.length > 0) {
          this.logger.warn(
            `PND managed watch install incomplete — failed ids: ${failedIds.join(', ')}`
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `PND managed watch installation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });

    if (!this.config.ui.useMockData && this.workflowsManagementApi != null) {
      const managementClient = new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi);
      this.watchProjection = new WatchWorkflowProjectionServiceImpl(
        managementClient,
        this.logger,
        installationReady
      );
    }

    // Stand up the Elasticsearch-backed investigation/proposal store. Index
    // creation + seeding happens lazily on the first authenticated request
    // (see InvestigationStore.ensureReady), because the internal user cannot
    // create arbitrary data indices — the request-scoped user can.
    if (!this.config.ui.useMockData) {
      const legacyStore = new InvestigationStore(this.logger);

      // When conversation shadow-write is enabled (and the Agent Builder
      // conversations plugin is available), wrap the legacy store in a
      // DualWriteStore that shadows every write to the platform Conversation
      // store. Shadow failures are logged and non-blocking.
      if (
        this.config.conversationShadowWrite &&
        plugins.agentBuilder &&
        typeof plugins.agentBuilder.conversations?.getScopedWriterClient === 'function'
      ) {
        const conversationStore = new PndConversationStore(
          this.logger.get('conversation-shadow'),
          legacyStore,
          // Resolver: obtain a scoped writer client using the request context.
          // The DualWriteStore passes the route's KibanaRequest through.
          (request) => plugins.agentBuilder!.conversations.getScopedWriterClient({ request })
        );
        this.investigationStore = new DualWriteStore(
          this.logger.get('dual-write'),
          legacyStore,
          conversationStore
        );
        this.logger.info('PND conversation shadow-write enabled (DualWriteStore active)');
      } else {
        this.investigationStore = legacyStore;
      }
    }

    return {};
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
