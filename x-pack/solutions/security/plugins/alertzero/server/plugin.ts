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
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_PLUGIN_NAME,
} from '../common/constants';
import type { AlertZeroConfig } from './config';
import type {
  AlertZeroPluginSetup,
  AlertZeroPluginStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';
import { registerAlertZeroInferenceFeatures } from './inference_features';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { WatchesService } from './services/watches/watches_service';
import { WorkersService } from './services/workers/workers_service';
import { ConversationProposalsService } from './services/conversation_proposals/conversation_proposals_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';
import { ActionsService } from './services/actions/actions_service';
import type { HuntServices } from './services/watches/hunt';
import { listActionsTool } from './agent_builder_tools/list_actions_tool';
import { reviseProposalTool } from './agent_builder_tools/revise_proposal_tool';
import { agentType, ensureAgent, ensureAgentSafe, registerAgentType } from './agent';
import { registerAttachments } from './agent_builder/attachments/register_attachments';
import { registerStepDefinitions } from './step_types';
import { registerHuntInvestigationTemplate } from './conversation_templates/hunt_investigation';

export class AlertZeroPlugin
  implements
    Plugin<
      AlertZeroPluginSetup,
      AlertZeroPluginStart,
      AlertZeroSetupDependencies,
      AlertZeroStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: AlertZeroConfig;
  private spaces?: AlertZeroStartDependencies['spaces'];
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];

  /** Created during `start`; routes resolve them lazily after managed-workflow initialization. */
  private watchesService?: WatchesService;
  private actionsService?: ActionsService;
  private workersService?: WorkersService;
  private conversationProposalsService?: ConversationProposalsService;
  private proposals?: AlertZeroStartDependencies['proposals'];
  private agentBuilderConversations?: AlertZeroStartDependencies['agentBuilder']['conversations'];
  private huntServices?: HuntServices;

  constructor(context: PluginInitializerContext<AlertZeroConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPluginStart>,
    {
      agentBuilder,
      proposals: _proposalsSetup,
      features,
      searchInferenceEndpoints,
      workflowsExtensions,
      workflowsManagement,
    }: AlertZeroSetupDependencies
  ): AlertZeroPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('AlertZero plugin is disabled');
      return { enabled: false };
    }

    this.logger.info('Setting up AlertZero plugin');

    this.workflowsManagementApi = workflowsManagement.management;

    registerOwner({ workflowsExtensions });
    registerAgentType(agentBuilder);
    registerAttachments(agentBuilder);
    registerHuntInvestigationTemplate(agentBuilder);
    registerAlertZeroInferenceFeatures(searchInferenceEndpoints, this.logger.get('inference'));
    // Steps register during setup but only run after start; deps resolve lazily.
    registerStepDefinitions({
      workflowsExtensions,
      getActionsService: () => this.requireActionsService(),
      getConversations: () => this.requireAgentBuilderConversations(),
    });
    // Registered in setup so the builtin tool is available to Agent Builder before
    // the first agent run; the handler resolves the service lazily like the routes do.
    agentBuilder.tools.register({
      ...listActionsTool(() => this.requireActionsService()),
    });
    agentBuilder.tools.register({
      ...reviseProposalTool(() => this.requireProposals()),
    });

    features.registerKibanaFeature({
      id: ALERTZERO_FEATURE_ID,
      name: ALERTZERO_PLUGIN_NAME,
      order: 1101,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', ALERTZERO_FEATURE_ID],
      privileges: {
        all: {
          app: ['kibana', ALERTZERO_FEATURE_ID],
          api: [ALERTZERO_API_PRIVILEGE_READ, ALERTZERO_API_PRIVILEGE_WRITE],
          savedObject: { all: [], read: [] },
          ui: ['show', 'write'],
        },
        read: {
          app: ['kibana', ALERTZERO_FEATURE_ID],
          api: [ALERTZERO_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
      getSpaceId: (request) => this.getSpaceId(request),
      getWatchesService: () => this.requireWatchesService(),
      getWorkersService: () => this.requireWorkersService(),
      getConversationProposalsService: () => this.requireConversationProposalsService(),
      getActionsService: () => this.requireActionsService(),
      getAgentBuilderConversations: () => this.requireAgentBuilderConversations(),
      getHuntServices: () => this.requireHuntServices(),
    });

    return { enabled: true };
  }

  start(_core: CoreStart, plugins: AlertZeroStartDependencies): AlertZeroPluginStart {
    this.spaces = plugins.spaces;
    this.proposals = plugins.proposals;
    this.agentBuilderConversations = plugins.agentBuilder?.conversations;

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
        `AlertZero managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    });

    this.conversationProposalsService = new ConversationProposalsService(
      plugins.proposals.getProposalsService(),
      plugins.agentBuilder,
      this.logger,
      plugins.agenticInvestigations.getImpactClient
    );

    this.watchesService = new WatchesService();
    this.actionsService = new ActionsService(
      () =>
        this.workflowsManagementApi
          ? new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi)
          : undefined,
      this.logger
    );
    this.workersService = new WorkersService(management, managedWorkflows, this.logger, {
      ensureAgentForSpace: plugins.agentBuilder
        ? (spaceId) =>
            ensureAgentSafe({ agentBuilder: plugins.agentBuilder!, spaceId, logger: this.logger })
        : undefined,
      agentBuilder: plugins.agentBuilder,
      agentTypes: [agentType],
    });

    this.huntServices = {
      getProposalsService: plugins.proposals.getProposalsService,
      getInference: () => plugins.inference,
      getSearchInferenceEndpoints: () => plugins.searchInferenceEndpoints,
    };

    return {};
  }

  private requireStarted<T>(value: T | undefined, name: string): T {
    if (!value) {
      throw new Error(`${name} is not available until the AlertZero plugin has started`);
    }
    return value;
  }

  private requireWatchesService(): WatchesService {
    return this.requireStarted(this.watchesService, 'Watches service');
  }

  private requireActionsService(): ActionsService {
    return this.requireStarted(this.actionsService, 'Actions service');
  }

  private requireProposals(): AlertZeroStartDependencies['proposals'] {
    return this.requireStarted(this.proposals, 'proposals plugin start contract');
  }

  private requireWorkersService(): WorkersService {
    return this.requireStarted(this.workersService, 'Workers service');
  }

  private requireConversationProposalsService(): ConversationProposalsService {
    return this.requireStarted(this.conversationProposalsService, 'ConversationProposalsService');
  }

  private requireAgentBuilderConversations(): AlertZeroStartDependencies['agentBuilder']['conversations'] {
    return this.requireStarted(this.agentBuilderConversations, 'agentBuilder.conversations');
  }

  private requireHuntServices(): HuntServices {
    return this.requireStarted(this.huntServices, 'Hunt services');
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
