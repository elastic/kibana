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
import { chunk } from 'lodash';
import type { Subscription } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentService } from '@kbn/fleet-plugin/server';
import {
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  TEMPLATE_ID_ESCALATION,
  TEMPLATE_ID_INVESTIGATION,
} from '@kbn/alertzero-common';
import { TRIAGE_GROUPING_FLAG } from './alert_triage/constants';
import { getSubscriptionAvailability } from '../common/availability';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_PLUGIN_NAME,
} from '../common/constants';
import type { AlertZeroConfig } from './config';

const INVESTIGATION_SUMMARY_PLUGIN_ID = 'agentic_investigations_summary';
const PROPOSAL_READ_CONCURRENCY = 5;

import type {
  AlertZeroRequestHandlerContext,
  AlertZeroPluginSetup,
  AlertZeroPluginStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
  ThreatIntelSupplyWorkflowInstaller,
} from './types';
import { registerAlertZeroInferenceFeatures } from './inference_features';
import { registerUiSettings } from './ui_settings';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { ensureFingerprintIndexMapping } from './context_engine/ensure_fingerprint_index';
import { registerInvestigationsAiIndex } from './context_engine/register_investigations_ai_index';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { installRegisteredWorkerForRequest } from './managed_workflows/worker_registry';
import { WatchesService } from './services/watches/watches_service';
import { WorkersService } from './services/workers/workers_service';
import { createGetWorkerBlockingReasons } from './services/workers/worker_blocking_reasons';
import { ConversationProposalsService } from './services/conversation_proposals/conversation_proposals_service';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';
import { ScanFailuresService } from './services/scan_failures/scan_failures_service';
import { ActionsService } from './services/actions/actions_service';
import type { HuntServices } from './services/watches/hunt';
import { listActionsTool } from './agent_builder_tools/list_actions_tool';
import { isSpaceSupported } from './lib/is_space_supported';
import { createAssertAlertZeroAccess } from './agent_builder_tools/assert_alertzero_access';
import { agentType, ensureAgent, ensureAgentSafe, registerAgentType } from './agent';
import { createActionDiscoverySkill } from './agent_builder/skills/action_discovery';
import { registerAttachments } from './agent_builder/attachments/register_attachments';
import type { StoryProposal } from './services/investigation_summary/format_story';
import { resolveScopedModel } from './routes/hunt/lib/scoped_model';
import { makeIsContextEngineEnabled } from './step_types/is_context_engine_enabled';
import { makeScopedResolveHostEnrollment } from './services/fleet/resolve_host_enrollment';
import { enumerateSpaceIds } from './lib/enumerate_space_ids';
import { ThreatIntelSupplyService } from './services/threat_intel_supply';
import {
  createAlertZeroTelemetryReporter,
  readTelemetryOptIn,
  registerAlertZeroTelemetryEvents,
} from './telemetry';
import {
  REPORT_STEP_OPT_IN_TIMEOUT_MS,
  registerAlertZeroStepDefinitions,
  registerStepDefinitions,
} from './step_types';

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
  private taskManager?: AlertZeroStartDependencies['taskManager'];
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  /** Resolved during `start`; the report step awaits it for its owner-bound managed check. */
  private managedWorkflows?: Promise<PluginScopedManagedWorkflowsApi | undefined>;

  /** Created during `start`; routes resolve them lazily after managed-workflow initialization. */
  private watchesService?: WatchesService;
  private actionsService?: ActionsService;
  private workersService?: WorkersService;
  private conversationProposalsService?: ConversationProposalsService;
  private proposals?: AlertZeroStartDependencies['proposals'];
  private agentBuilderConversations?: NonNullable<
    AlertZeroStartDependencies['agentBuilder']
  >['conversations'];
  private agentBuilderAttachments?: NonNullable<
    AlertZeroStartDependencies['agentBuilder']
  >['attachments'];
  private searchInferenceEndpoints?: AlertZeroStartDependencies['searchInferenceEndpoints'];
  private inference?: AlertZeroStartDependencies['inference'];
  private huntServices?: HuntServices;
  private fleetAgentService?: AgentService;
  private coreStart?: CoreStart;
  private triageGroupingEnabled = true;
  private triageGroupingFlagSubscription?: Subscription;
  private scanFailuresService?: ScanFailuresService;
  private threatIntelSupplyService?: ThreatIntelSupplyService;

  /**
   * Set by security_solution's `start()` via `registerThreatIntelSupplyWorkflowInstaller`.
   * May be unset when `ThreatIntelSupplyService` is constructed; that service reads it lazily.
   */
  private threatIntelSupplyWorkflowInstaller?: ThreatIntelSupplyWorkflowInstaller;

  /** Set in start from `xpack.security.serviceAccounts.enabled`. False until then. */
  private serviceAccountsEnabled = false;

  constructor(context: PluginInitializerContext<AlertZeroConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  private readonly registerThreatIntelSupplyWorkflowInstaller = (
    installer: ThreatIntelSupplyWorkflowInstaller
  ): void => {
    this.threatIntelSupplyWorkflowInstaller = installer;
  };

  /**
   * False while the fingerprint template install is in flight, and after it fails.
   * `start` cannot return a promise, so the matcher reads this as it changes.
   */
  private fingerprintWritesAllowed = true;

  private readonly alertZeroStartContract = (): AlertZeroPluginStart => {
    const plugin = this;
    return {
      registerThreatIntelSupplyWorkflowInstaller: this.registerThreatIntelSupplyWorkflowInstaller,
      get attackFingerprintWritesAllowed() {
        return plugin.fingerprintWritesAllowed;
      },
    };
  };

  setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPluginStart>,
    {
      agentBuilder,
      proposals,
      agenticInvestigations,
      contextEngine,
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
    // Inside the guard too: with the kill switch off, no AlertZero event type exists to report.
    registerAlertZeroTelemetryEvents(coreSetup.analytics);

    this.workflowsManagementApi = workflowsManagement.management;

    // Missing runtime dependencies must not make installed workflows eligible for orphan cleanup.
    registerOwner({ workflowsExtensions });
    if (contextEngine) {
      registerInvestigationsAiIndex({ contextEngine });
    }
    // Outside the optional-plugin guard below: the browser offers this step whenever AlertZero is
    // enabled, and an unregistered step type fails the run before `on-failure: continue` applies.
    // The handler reports only for a managed Worker, which needs those plugins.
    registerAlertZeroStepDefinitions({
      analytics: coreSetup.analytics,
      areServiceAccountsEnabled: () => this.serviceAccountsEnabled,
      getManagedWorkflowState: async () => this.managedWorkflows,
      getWorkflowsManagement: () => this.workflowsManagementApi,
      isTelemetryOptedIn: async () => {
        const [, { telemetry }] = await coreSetup.getStartServices();
        return readTelemetryOptIn({
          isOptedIn$: telemetry?.isOptedIn$,
          timeoutMs: REPORT_STEP_OPT_IN_TIMEOUT_MS,
        });
      },
      logger: this.logger.get('telemetry'),
      workflowsExtensions,
    });
    if (agentBuilder && proposals && agenticInvestigations) {
      const assertAlertZeroAccess = createAssertAlertZeroAccess(async () => {
        const [core, { security, spaces }] = await coreSetup.getStartServices();
        return { core, security, spaces, isServerless: this.isServerless };
      });
      registerAgentType(agentBuilder);
      registerAttachments(agentBuilder);
      // Registered in setup so the builtin tool is available to Agent Builder before
      // the first agent run; the handler resolves the service lazily like the routes do.
      agentBuilder.tools.register({
        ...listActionsTool(() => this.requireActionsService(), assertAlertZeroAccess),
      });
      agentBuilder.skills.register(createActionDiscoverySkill(assertAlertZeroAccess));
      // `ai.conversation.updated` is opt-in, so Agent Builder only emits it where a consumer
      // subscribes. Scoped per space, like the routes, so spaces without AlertZero, and Classic
      // spaces, stay quiet.
      agentBuilder.conversations.enableUpdatedTrigger({
        templateIds: [TEMPLATE_ID_INVESTIGATION, TEMPLATE_ID_ESCALATION],
        isEnabled: async (request) => {
          const [{ savedObjects, uiSettings }, { spaces }] = await coreSetup.getStartServices();
          if (!(await isSpaceSupported({ isServerless: this.isServerless, spaces, request }))) {
            return false;
          }
          return uiSettings
            .asScopedToClient(savedObjects.getScopedClient(request))
            .get<boolean>(ALERTZERO_ENABLED_SETTING_ID);
        },
      });
    }

    registerAlertZeroInferenceFeatures(searchInferenceEndpoints, this.logger.get('inference'));
    // Steps register during setup but only run after start; deps resolve lazily.
    const stepsLogger = this.logger.get('steps');
    registerStepDefinitions({
      workflowsExtensions,
      getActionsService: () => this.requireActionsService(),
      getConversations: () => this.requireAgentBuilderConversations(),
      resolveChatModel: (request) => this.resolveSummaryChatModel(request),
      getProposals: (proposalIds, spaceId, request) =>
        this.readProposals(proposalIds, spaceId, request),
      getHuntServices: () => this.requireHuntServices(),
      getResolveHostEnrollment: makeScopedResolveHostEnrollment(
        () => this.fleetAgentService,
        stepsLogger
      ),
      isContextEngineEnabled: makeIsContextEngineEnabled(() => this.requireCoreStart()),
      getInternalEsClient: () => this.requireCoreStart().elasticsearch.client.asInternalUser,
      getTaskManager: () => this.requireStarted(this.taskManager, 'Task Manager'),
      grouping: {
        getProposals: () => this.requireProposals(),
        getWorkflowsManagement: () => this.workflowsManagementApi,
        isGroupingEnabled: async () => this.triageGroupingEnabled,
      },
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
      async (context, request) => ({
        hasRequiredDependencies: Boolean(
          agentBuilder && proposals && agenticInvestigations && this.serviceAccountsEnabled
        ),
        isSpaceSupported: await isSpaceSupported({
          isServerless: this.isServerless,
          spaces: this.spaces,
          request,
        }),
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
      getAgentBuilderAttachments: () => this.requireAgentBuilderAttachments(),
      getHuntServices: () => this.requireHuntServices(),
      getScanFailuresService: () => this.requireScanFailuresService(),
      getThreatIntelSupplyService: () => this.threatIntelSupplyService,
      reportTelemetryEvent: createAlertZeroTelemetryReporter({
        analytics: coreSetup.analytics,
        logger: this.logger.get('telemetry'),
      }),
    });

    return { isEnabled: true, setServerlessTierAvailable: this.setServerlessTierAvailable };
  }

  start(core: CoreStart, plugins: AlertZeroStartDependencies): AlertZeroPluginStart {
    this.spaces = plugins.spaces;
    this.taskManager = plugins.taskManager;
    this.coreStart = core;
    // The kill switch for Alert Triage grouping. It stays on where no flag provider exists.
    this.triageGroupingFlagSubscription = core.featureFlags
      .getBooleanValue$(TRIAGE_GROUPING_FLAG, true)
      .subscribe((enabled) => {
        this.triageGroupingEnabled = enabled;
      });
    this.fleetAgentService = plugins.fleet?.agentService;
    this.proposals = plugins.proposals;
    this.agentBuilderConversations = plugins.agentBuilder?.conversations;
    this.agentBuilderAttachments = plugins.agentBuilder?.attachments;
    this.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
    this.inference = plugins.inference;

    if (!this.config.enabled) {
      return this.alertZeroStartContract();
    }

    // Plugin start cannot return a promise. Writes stay refused until this settles, so a
    // worker that runs in that gap reviews every attack and does not auto-create the index.
    this.fingerprintWritesAllowed = false;
    void ensureFingerprintIndexMapping(core.elasticsearch.client.asInternalUser, this.logger).then(
      (allowed) => {
        this.fingerprintWritesAllowed = allowed;
      },
      () => {
        this.fingerprintWritesAllowed = false;
      }
    );

    this.serviceAccountsEnabled = core.security.serviceAccounts.isEnabled();

    const { agentBuilder, agenticInvestigations, proposals } = plugins;
    // Optional dependencies allow the upgrade shell to load without starting feature work.
    // Service accounts are required the same way: with the flag off the plugin stays mounted
    // for the unavailable screen and does not install or schedule workers.
    if (!agentBuilder || !proposals || !agenticInvestigations || !this.serviceAccountsEnabled) {
      return this.alertZeroStartContract();
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
    this.managedWorkflows = managedWorkflows;

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
    this.threatIntelSupplyService =
      management != null
        ? new ThreatIntelSupplyService({
            management,
            managedWorkflows,
            logger: this.logger,
            // Internal user: TI reports index is plugin-owned / hidden; route authz
            // already gates who can enable Hunt.
            getEsClient: async () => core.elasticsearch.client.asInternalUser,
            enumerateSpaceIds: () =>
              enumerateSpaceIds(core.savedObjects.createInternalRepository(['space'])),
            // security_solution registers after this plugin starts; read lazily.
            getWorkflowInstaller: () => this.threatIntelSupplyWorkflowInstaller,
            getSearchInferenceEndpoints: () => this.searchInferenceEndpoints,
            getInference: () => plugins.inference,
            getUiSettingsClient: (request) =>
              core.uiSettings.asScopedToClient(core.savedObjects.getScopedClient(request)),
          })
        : undefined;

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
      async (request, registration, options) => {
        const client = await plugins.workflowsExtensions.getClient(request);
        await installRegisteredWorkerForRequest(client.managedWorkflows, registration, options);
      },
      createGetWorkerBlockingReasons(plugins.searchInferenceEndpoints, this.logger.get('workers')),
      this.threatIntelSupplyService
    );

    this.scanFailuresService = new ScanFailuresService(management, this.logger);

    const mitreDataClient = plugins.mitreAttack?.getMitreDataClient?.();

    this.huntServices = {
      getProposalsService: () => this.requireProposals().getProposalsService(),
      getProposalPrivileges: () => this.requireProposals().getProposalPrivileges(),
      getInference: () => plugins.inference,
      getSearchInferenceEndpoints: () => plugins.searchInferenceEndpoints,
      mitreDataClient,
    };

    return this.alertZeroStartContract();
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

  private requireAgentBuilderAttachments(): NonNullable<
    AlertZeroStartDependencies['agentBuilder']
  >['attachments'] {
    return this.requireStarted(this.agentBuilderAttachments, 'agentBuilder.attachments');
  }

  private async resolveSummaryChatModel(request: KibanaRequest) {
    const core = this.requireCoreStart();
    const outcome = await resolveScopedModel({
      inference: this.inference,
      searchInferenceEndpoints: this.searchInferenceEndpoints,
      featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      request,
      uiSettingsClient: core.uiSettings.asScopedToClient(
        core.savedObjects.getScopedClient(request)
      ),
      logger: this.logger.get('investigation-summary'),
      chatModelOptions: {
        telemetryMetadata: {
          pluginId: INVESTIGATION_SUMMARY_PLUGIN_ID,
          aggregateBy: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
        },
      },
    });
    return outcome.ok ? outcome.model.chatModel : undefined;
  }

  private async readProposals(
    proposalIds: string[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<Record<string, StoryProposal>> {
    try {
      const proposals = this.requireProposals();
      // The service reads as the internal user, so the caller's own privilege is checked first.
      await proposals.getProposalPrivileges().assertCanRead(request);
      const service = proposals.getProposalsService();
      const found: Array<[string, StoryProposal]> = [];
      for (const batch of chunk(proposalIds, PROPOSAL_READ_CONCURRENCY)) {
        const results = await Promise.allSettled(
          batch.map((id) => service.get(id, spaceId, request))
        );
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { title, status, decision, comment, supersededBy } = result.value;
            found.push([batch[index], { title, status, decision, comment, supersededBy }]);
          } else {
            this.logger.debug(
              `AlertZero investigation summary could not read proposal ${batch[index]}. ${result.reason}`
            );
          }
        });
      }
      return Object.fromEntries(found);
    } catch (error) {
      this.logger.debug(`AlertZero investigation summary could not read proposals. ${error}`);
      return {};
    }
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

  stop() {
    this.triageGroupingFlagSubscription?.unsubscribe();
  }
}
