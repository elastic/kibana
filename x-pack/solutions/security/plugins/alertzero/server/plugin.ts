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
import { i18n } from '@kbn/i18n';
import {
  ALERTZERO_API_PRIVILEGE_MANAGE_ESCALATIONS,
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_PLUGIN_NAME,
  ALERTZERO_UI_CAPABILITY_MANAGE_ESCALATIONS,
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
import { listActionsTool } from './agent_builder_tools/list_actions_tool';
import { reviseProposalTool } from './agent_builder_tools/revise_proposal_tool';
import { agentType, ensureAgent, ensureAgentSafe, registerAgentType } from './agent';

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
  private agenticInvestigations?: AlertZeroStartDependencies['agenticInvestigations'];

  constructor(context: PluginInitializerContext<AlertZeroConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPluginStart>,
    {
      agentBuilder,
      agenticInvestigations: _agenticInvestigationsSetup,
      features,
      searchInferenceEndpoints,
      workflowsExtensions,
      workflowsManagement,
    }: AlertZeroSetupDependencies
  ): AlertZeroPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('AlertZero plugin is disabled');
      return {};
    }

    this.logger.info('Setting up AlertZero plugin');

    this.workflowsManagementApi = workflowsManagement.management;

    registerOwner({ workflowsExtensions });
    registerAgentType(agentBuilder);
    registerAlertZeroInferenceFeatures(searchInferenceEndpoints, this.logger.get('inference'));
    // Registered in setup so the builtin tool is available to Agent Builder before
    // the first agent run; the handler resolves the service lazily like the routes do.
    agentBuilder.tools.register({
      ...listActionsTool(() => this.requireActionsService()),
    });
    agentBuilder.tools.register({
      ...reviseProposalTool(() => this.requireAgenticInvestigations()),
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
      subFeatures: [
        {
          name: i18n.translate('xpack.alertzero.feature.incidentsTitle', {
            defaultMessage: 'Incidents',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'manage_escalations',
                  name: i18n.translate('xpack.alertzero.feature.manageEscalationsLabel', {
                    defaultMessage: 'Create and link incidents',
                  }),
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  api: [ALERTZERO_API_PRIVILEGE_MANAGE_ESCALATIONS],
                  ui: [ALERTZERO_UI_CAPABILITY_MANAGE_ESCALATIONS],
                },
              ],
            },
          ],
        },
      ],
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
    });

    return {};
  }

  start(_core: CoreStart, plugins: AlertZeroStartDependencies): AlertZeroPluginStart {
    this.spaces = plugins.spaces;
    this.agenticInvestigations = plugins.agenticInvestigations;

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
      plugins.agenticInvestigations.getProposalsService(),
      plugins.agentBuilder,
      this.logger
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

    return {};
  }

  private requireWatchesService(): WatchesService {
    if (!this.watchesService) {
      throw new Error('Watches service is not available until the AlertZero plugin has started');
    }
    return this.watchesService;
  }

  private requireActionsService(): ActionsService {
    if (!this.actionsService) {
      throw new Error('Actions service is not available until the AlertZero plugin has started');
    }
    return this.actionsService;
  }
  private requireAgenticInvestigations(): AlertZeroStartDependencies['agenticInvestigations'] {
    if (!this.agenticInvestigations) {
      throw new Error(
        'agenticInvestigations plugin start contract is not available until the AlertZero plugin has started'
      );
    }
    return this.agenticInvestigations;
  }
  private requireWorkersService(): WorkersService {
    if (!this.workersService) {
      throw new Error('Workers service is not available until the AlertZero plugin has started');
    }
    return this.workersService;
  }

  private requireConversationProposalsService(): ConversationProposalsService {
    if (!this.conversationProposalsService) {
      throw new Error(
        'ConversationProposalsService is not available until the AlertZero plugin has started'
      );
    }
    return this.conversationProposalsService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
