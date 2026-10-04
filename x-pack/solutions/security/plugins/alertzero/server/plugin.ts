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
import type { AgentService } from '@kbn/fleet-plugin/server';
import { SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED } from '@kbn/management-settings-ids';
import { getSubscriptionAvailability } from '../common/availability';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_PLUGIN_NAME,
} from '../common/constants';
import type { AlertZeroConfig } from './config';
import type {
  AlertZeroRequestHandlerContext,
  AlertTriageAttachmentServiceProvider,
  AlertZeroPluginSetup,
  AlertZeroPluginStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';
import { registerAlertZeroInferenceFeatures } from './inference_features';
import { registerUiSettings } from './ui_settings';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { installRegisteredWorkerForRequest } from './managed_workflows/worker_registry';
import { WatchesService } from './services/watches/watches_service';
import { WorkersService } from './services/workers/workers_service';
import { ConversationProposalsService } from './services/conversation_proposals/conversation_proposals_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';
import { ScanFailuresService } from './services/scan_failures/scan_failures_service';
import { ActionsService } from './services/actions/actions_service';
import type { HuntServices } from './services/watches/hunt';
import { listActionsTool } from './agent_builder_tools/list_actions_tool';
import { createAssertAlertZeroAccess } from './agent_builder_tools/assert_alertzero_access';
import { agentType, ensureAgent, ensureAgentSafe, registerAgentType } from './agent';
import { createActionDiscoverySkill } from './agent_builder/skills/action_discovery';
import { registerAttachments } from './agent_builder/attachments/register_attachments';
import { registerStepDefinitions } from './step_types';
import { makeIsContextEngineEnabled } from './step_types/is_context_engine_enabled';
import { makeScopedResolveHostEnrollment } from './services/fleet/resolve_host_enrollment';

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
  private readonly isServerless: boolean;
  private serverlessTierAvailable = false;

  private readonly setServerlessTierAvailable = (available: boolean): void => {
    this.serverlessTierAvailable = available;
  };
  private spaces?: AlertZeroStartDependencies['spaces'];
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];

  /** Created during `start`; routes resolve them lazily after managed-workflow initialization. */
  private watchesService?: WatchesService;
  private actionsService?: ActionsService;
  private workersService?: WorkersService;
  private conversationProposalsService?: ConversationProposalsService;
  private proposals?: AlertZeroStartDependencies['proposals'];
  private agentBuilderConversations?: NonNullable<
    AlertZeroStartDependencies['agentBuilder']
  >['conversations'];
  private huntServices?: HuntServices;
  private fleetAgentService?: AgentService;
  private coreStart?: CoreStart;
  private scanFailuresService?: ScanFailuresService;

  /**
   * Set by whichever optional consumer's `start()` calls `registerAlertTriageAttachmentServiceProvider`
   * (see `AlertZeroPluginStart`). May still be unset when `WorkersService` is constructed below,
   * since that consumer starts after this plugin; `WorkersService` reads it lazily per call.
   */
  private alertTriageAttachmentServiceProvider?: AlertTriageAttachmentServiceProvider;

  /** Set in start from `xpack.security.serviceAccounts.enabled`. False until then. */
  private serviceAccountsEnabled = false;

  constructor(context: PluginInitializerContext<AlertZeroConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  private readonly registerAlertTriageAttachmentServiceProvider = (
    provider: AlertTriageAttachmentServiceProvider
  ): void => {
    this.alertTriageAttachmentServiceProvider = provider;
  };

  setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPluginStart>,
    {
      agentBuilder,
      proposals,
      agenticInvestigations,
      features,
      searchInferenceEndpoints,
      workflowsExtensions,
      workflowsManagement,
    }: AlertZeroSetupDependencies
  ): AlertZeroPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('AlertZero plugin is disabled');
      return { isEnabled: false, setServerlessTierAvailable: this.setServerlessTierAvailable };
    }

    this.logger.info('Setting up AlertZero plugin');

    // Registered inside the config guard so the deployment kill switch removes the setting
    // entirely; `withAlertZeroEnabled` then never reads an unregistered key.
    registerUiSettings(coreSetup.uiSettings);

    this.workflowsManagementApi = workflowsManagement.management;

    // Missing runtime dependencies must not make installed workflows eligible for orphan cleanup.
    registerOwner({ workflowsExtensions });
    if (agentBuilder && proposals && agenticInvestigations) {
      const assertAlertZeroAccess = createAssertAlertZeroAccess(async () => {
        const [core, { security }] = await coreSetup.getStartServices();
        return { core, security };
      });
      registerAgentType(agentBuilder);
      registerAttachments(agentBuilder);
      // Registered in setup so the builtin tool is available to Agent Builder before
      // the first agent run; the handler resolves the service lazily like the routes do.
      agentBuilder.tools.register({
        ...listActionsTool(() => this.requireActionsService(), assertAlertZeroAccess),
      });
      agentBuilder.skills.register(createActionDiscoverySkill(assertAlertZeroAccess));
    }

    registerAlertZeroInferenceFeatures(searchInferenceEndpoints, this.logger.get('inference'));
    // Steps register during setup but only run after start; deps resolve lazily.
    const stepsLogger = this.logger.get('steps');
    registerStepDefinitions({
      workflowsExtensions,
      getActionsService: () => this.requireActionsService(),
      getConversations: () => this.requireAgentBuilderConversations(),
      getHuntServices: () => this.requireHuntServices(),
      getResolveHostEnrollment: makeScopedResolveHostEnrollment(
        () => this.fleetAgentService,
        stepsLogger
      ),
      isContextEngineEnabled: makeIsContextEngineEnabled(() => this.requireCoreStart()),
      logger: stepsLogger,
    });

    features.registerKibanaFeature({
      id: ALERTZERO_FEATURE_ID,
      name: ALERTZERO_PLUGIN_NAME,
      order: 1101,
      minimumLicense: 'enterprise',
      category: DEFAULT_APP_CATEGORIES.security,
      // Keep the app mountable for upgrade and access-denied screens; APIs enforce privileges.
      app: ['kibana'],
      privileges: {
        all: {
          app: ['kibana'],
          api: [ALERTZERO_API_PRIVILEGE_READ, ALERTZERO_API_PRIVILEGE_WRITE],
          savedObject: { all: [], read: [] },
          ui: ['show', 'write'],
        },
        read: {
          app: ['kibana'],
          api: [ALERTZERO_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
    });

    coreSetup.http.registerRouteHandlerContext<AlertZeroRequestHandlerContext, 'alertzero'>(
      'alertzero',
      async (context) => ({
        hasRequiredDependencies: Boolean(
          agentBuilder && proposals && agenticInvestigations && this.serviceAccountsEnabled
        ),
        subscription: getSubscriptionAvailability({
          isServerless: this.isServerless,
          serverlessTierAvailable: this.serverlessTierAvailable,
          license: this.isServerless ? undefined : (await context.licensing).license,
        }),
      })
    );
    const router = coreSetup.http.createRouter<AlertZeroRequestHandlerContext>();

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
      getScanFailuresService: () => this.requireScanFailuresService(),
    });

    return { isEnabled: true, setServerlessTierAvailable: this.setServerlessTierAvailable };
  }

  start(core: CoreStart, plugins: AlertZeroStartDependencies): AlertZeroPluginStart {
    this.spaces = plugins.spaces;
    this.coreStart = core;
    this.fleetAgentService = plugins.fleet?.agentService;
    this.proposals = plugins.proposals;
    this.agentBuilderConversations = plugins.agentBuilder?.conversations;

    if (!this.config.enabled) {
      return {
        registerAlertTriageAttachmentServiceProvider:
          this.registerAlertTriageAttachmentServiceProvider,
      };
    }

    this.serviceAccountsEnabled = core.security.serviceAccounts.isEnabled();

    const { agentBuilder, agenticInvestigations, proposals } = plugins;
    // Optional dependencies allow the upgrade shell to load without starting feature work.
    // Service accounts are required the same way: with the flag off the plugin stays mounted
    // for the unavailable screen and does not install or schedule workers.
    if (!agentBuilder || !proposals || !agenticInvestigations || !this.serviceAccountsEnabled) {
      return {
        registerAlertTriageAttachmentServiceProvider:
          this.registerAlertTriageAttachmentServiceProvider,
      };
    }
    void ensureAgentSafe({ agentBuilder, spaceId: DEFAULT_SPACE_ID, logger: this.logger });

    const management = this.workflowsManagementApi
      ? new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi)
      : undefined;
    const managedWorkflows = initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
      ensureAgentForSpace: (spaceId) => ensureAgent({ agentBuilder, spaceId }),
    }).catch((error) => {
      this.logger.error(
        `AlertZero managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    });

    this.conversationProposalsService = new ConversationProposalsService(
      proposals.getProposalsService(),
      agentBuilder,
      this.logger,
      agenticInvestigations.getImpactClient
    );

    this.watchesService = new WatchesService();
    this.actionsService = new ActionsService(
      () =>
        this.workflowsManagementApi
          ? new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi)
          : undefined,
      this.logger
    );
    this.workersService = new WorkersService(
      management,
      managedWorkflows,
      this.logger,
      {
        ensureAgentForSpace: (spaceId) =>
          ensureAgentSafe({ agentBuilder, spaceId, logger: this.logger }),
        agentBuilder,
        agentTypes: [agentType],
      },
      {
        // Reads whatever was registered via `registerAlertTriageAttachmentServiceProvider` at
        // call time, not at construction time — a consumer may register after this plugin has
        // started, since this plugin's optional consumers necessarily start after it does.
        getAttachmentService: (request, workflowId) =>
          this.alertTriageAttachmentServiceProvider
            ? this.alertTriageAttachmentServiceProvider(request, workflowId)
            : Promise.resolve(undefined),
        // Read per request: the setting is space-scoped, so a Worker enabled in one space
        // says nothing about another. Resolved here rather than in WorkersService because
        // the setting belongs to security_solution.
        isAlertAnalysisRuntimeEnabled: async (request) =>
          core.uiSettings
            .asScopedToClient(core.savedObjects.getScopedClient(request))
            .get<boolean>(SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED),
      },
      async (request, registration, options) => {
        const client = await plugins.workflowsExtensions.getClient(request);
        await installRegisteredWorkerForRequest(client.managedWorkflows, registration, options);
      }
    );

    this.scanFailuresService = new ScanFailuresService(management, this.logger);

    this.huntServices = {
      getProposalsService: () => this.requireProposals().getProposalsService(),
      getInference: () => plugins.inference,
      getSearchInferenceEndpoints: () => plugins.searchInferenceEndpoints,
    };

    return {
      registerAlertTriageAttachmentServiceProvider:
        this.registerAlertTriageAttachmentServiceProvider,
    };
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

  private requireProposals(): NonNullable<AlertZeroStartDependencies['proposals']> {
    return this.requireStarted(this.proposals, 'proposals plugin start contract');
  }

  private requireWorkersService(): WorkersService {
    return this.requireStarted(this.workersService, 'Workers service');
  }

  private requireConversationProposalsService(): ConversationProposalsService {
    return this.requireStarted(this.conversationProposalsService, 'ConversationProposalsService');
  }

  private requireAgentBuilderConversations(): NonNullable<
    AlertZeroStartDependencies['agentBuilder']
  >['conversations'] {
    return this.requireStarted(this.agentBuilderConversations, 'agentBuilder.conversations');
  }

  private requireHuntServices(): HuntServices {
    return this.requireStarted(this.huntServices, 'Hunt services');
  }

  private requireCoreStart(): CoreStart {
    return this.requireStarted(this.coreStart, 'CoreStart');
  }

  private requireScanFailuresService(): ScanFailuresService {
    return this.requireStarted(this.scanFailuresService, 'Scan failures service');
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  stop() {}
}
