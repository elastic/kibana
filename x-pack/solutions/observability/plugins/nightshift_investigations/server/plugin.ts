/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ZodObject } from '@kbn/zod/v4';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { KibanaRequest } from '@kbn/core/server';
import { asSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AvailabilityConfig } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { InvestigationAttachmentDocService } from '@kbn/agentic-investigations-plugin/server';
import { getTelemetryTargets } from './telemetry_targets';
import type { NightshiftInvestigationsConfig } from './config';
import {
  InvestigationLocatorDefinition,
  NightshiftSettingsLocatorDefinition,
} from '../common/locators';
import { NightshiftInvestigationsClient } from './client/investigations_client';
import { createIsNightshiftEnabledSync } from './is_nightshift_enabled';
import { createGatedSandboxStart } from './sandbox_gate';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from './lib/managed_workflows/constants';
import { installInvestigationWorkflow } from './lib/managed_workflows/install_investigation_workflow';
import { installDecisionTreeWorkflows } from './lib/managed_workflows/install_decision_tree_workflows';
import { installSandboxMaterializeWorkspaceWorkflow } from './lib/managed_workflows/install_sandbox_materialize_workspace';
import { installAgentOptimizationsWorkflow } from './lib/managed_workflows/install_agent_optimizations';
import { installInvestigationAgent } from './lib/install_investigation_agent';
import {
  createInvestigatorServiceAccountService,
  type InvestigatorServiceAccountService,
} from './lib/service_account/investigator_service_account';
import { installAssistantAgent } from './lib/install_assistant_agent';
import { createInvestigationAvailability } from './create_investigation_availability';
import { nightshiftInvestigationsRouteRepository } from './routes';
import type { GetEpisodeLookup } from './routes/types';
import {
  isInvestigationInfrastructureAvailable,
  isInvestigationRunAvailable,
} from './is_investigation_available';
import { ensureInvestigationAgentStepDefinition } from './step_definitions/ensure_investigation_agent';
import { notificationRoutingAttachment } from './lib/notifications/notification_routing';
import type { StoredNotificationRouting } from './lib/notifications/notification_routing';
import { NotificationRoutingClient } from './lib/notifications/notification_routing_client';
import { sendNotificationsStepDefinition } from './step_definitions/send_notifications';
import { handleInvestigationFailureStepDefinition } from './step_definitions/handle_investigation_failure';
import { renderSlackMessageStepDefinition } from './step_definitions/render_slack_message';
import { triggerInvestigationStepDefinition } from './step_definitions/trigger_investigation';
import { followUpRecoveredAlertStepDefinition } from './step_definitions/follow_up_recovered_alert';
import { classifyOnlineEvalsRoundStepDefinition } from './step_definitions/classify_online_evals_round';
import { createIsOnlineEvalsPaused } from './online_evals/is_online_evals_paused';
import { obtainSandboxStepDefinition } from './step_definitions/obtain_sandbox';
import { composeHydrateNotificationsStepDefinition } from './step_definitions/compose_hydrate_notifications';
import { resolveModelStepDefinition } from './step_definitions/resolve_model';
import { cortexHydrateStepDefinition } from './step_definitions/cortex_hydrate';
import { memoryMaterializeToSandboxStepDefinition } from './step_definitions/memory_materialize_to_sandbox';
import { cortexOptimizeStepDefinition } from './step_definitions/cortex_optimize';
import { decisionTreeHydrateStepDefinition } from './step_definitions/decision_tree_hydrate';
import { decisionTreePrepareStepDefinition } from './step_definitions/decision_tree_prepare';
import { decisionTreeReinforceStepDefinition } from './step_definitions/decision_tree_reinforce';
import { memoryOptimizeStepDefinition } from './step_definitions/memory_optimize';
import { createCortexStore, registerCortexAiIndex } from './cortex/register_cortex';
import { registerMemoryAiIndex } from './memory/register_memory';
import { registerCortexTelemetryEvents } from './telemetry';
import { createMemoryPageStore } from './memory/page_store';
import { createDecisionTreeStore } from './decision_trees/store';
import { createKnowledgePurgeClient } from './purge/purge_client';
import { registerDecisionTreeAiIndex } from './decision_trees/register_decision_trees';
import { setupNightshiftTelemetry } from './telemetry';
import { createTriggerEmitter, type TriggerEmitter } from './workflows/triggers/emit';
import { registerInvestigationsWorkflowTriggers } from './workflows/triggers/register_triggers';
import type { NightshiftAgentTypeOptions } from './agents/investigation';
import {
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  registerInvestigationAgentType,
} from './agents/investigation';
import { registerDecisionTreeReinforcementAgentType } from './agents/decision_tree_reinforcement';
import { registerAssistantAgentType } from './agents/assistant';
import { createDecisionTreeTools } from './tools/decision_tree';
import { createSandboxBashTool } from './tools/sandbox_bash/tool';
import { createSandboxViewFileTool } from './tools/sandbox_bash/view_file_tool';
import { createSandboxStrReplaceTool } from './tools/sandbox_bash/str_replace_tool';
import { createSandboxWriteFileTool } from './tools/sandbox_bash/write_file_tool';
import { createConnectorCredentialResolver } from './tools/sandbox_bash/connector_credentials';
import { createSandboxWorkspaceManager } from './tools/sandbox_bash/sandbox_workspace_manager';
import {
  createSandboxOutputRedactorProvider,
  withSandboxOutputRedaction,
} from './tools/sandbox_bash/sandbox_output_redaction';
import { createSandboxToolAvailability } from './tools/sandbox_bash/sandbox_tool_availability';
import {
  nightshiftCustomContextSavedObjectType,
  nightshiftAutomationSavedObjectType,
  nightshiftAutomationBudgetSavedObjectType,
  NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
  NIGHTSHIFT_AUTOMATION_SO_TYPE,
} from './saved_objects';
import { createOnboardingClient } from './onboarding/onboarding_client';
import {
  createListSandboxConnectors,
  createListSandboxConnectorTypes,
} from './lib/list_sandbox_connectors';
import { createCustomContextClient } from './custom_context';
import type {
  InvestigationQuotaCallback,
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';

type ManagedWorkflowsClient = Awaited<
  ReturnType<WorkflowsExtensionsServerPluginStart['initManagedWorkflowsClient']>
>;

export class NightshiftInvestigationsPlugin
  implements
    Plugin<
      NightshiftInvestigationsServerSetup,
      NightshiftInvestigationsServerStart,
      NightshiftInvestigationsSetupDeps,
      NightshiftInvestigationsStartDeps
    >
{
  private readonly logger: Logger;
  private workflowsManagement?: NightshiftInvestigationsSetupDeps['workflowsManagement'];
  private workflowsExtensionsStart?: NightshiftInvestigationsStartDeps['workflowsExtensions'];
  private spaces?: NightshiftInvestigationsStartDeps['spaces'];
  private agentBuilder?: NightshiftInvestigationsStartDeps['agentBuilder'];
  private agenticInvestigations?: NightshiftInvestigationsStartDeps['agenticInvestigations'];
  private proposals?: NightshiftInvestigationsStartDeps['proposals'];
  private evals?: NightshiftInvestigationsStartDeps['evals'];
  private inference?: NightshiftInvestigationsStartDeps['inference'];
  private sandboxStart?: NightshiftInvestigationsStartDeps['sandbox'];
  private ruleRegistry?: NightshiftInvestigationsStartDeps['ruleRegistry'];
  private alertingVTwo?: NightshiftInvestigationsStartDeps['alertingVTwo'];
  private elasticsearch?: ElasticsearchServiceStart;
  private savedObjects?: CoreStart['savedObjects'];
  private uiSettings?: CoreStart['uiSettings'];
  private featureFlags?: CoreStart['featureFlags'];
  private actionsStart?: ActionsPluginStart;
  private securityStart?: NightshiftInvestigationsStartDeps['security'];
  private security?: CoreStart['security'];
  private coreStart?: CoreStart;
  private investigatorServiceAccountService?: InvestigatorServiceAccountService;
  /** The managed workflows client of this plugin, shared by startup installs and setup. */
  private managedWorkflowsClient?: Promise<ManagedWorkflowsClient>;
  private notificationRoutingService?: InvestigationAttachmentDocService<StoredNotificationRouting>;
  private investigationAvailability?: AvailabilityConfig;
  private cortexEnabled = false;
  private memoryEnabled = false;
  private investigationQuotaCallback?: InvestigationQuotaCallback;
  private decisionTreesEnabled = false;
  private assistantEnabled = false;

  constructor(private readonly ctx: PluginInitializerContext<NightshiftInvestigationsConfig>) {
    this.logger = ctx.logger.get();
  }

  setup(
    core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>,
    plugins: NightshiftInvestigationsSetupDeps
  ): NightshiftInvestigationsServerSetup {
    this.workflowsManagement = plugins.workflowsManagement;
    const investigationLocator = plugins.share.url.locators.create(
      new InvestigationLocatorDefinition()
    );
    const settingsLocator = plugins.share.url.locators.create(
      new NightshiftSettingsLocatorDefinition()
    );
    registerInvestigationsWorkflowTriggers(plugins.workflowsExtensions);
    const isNightshiftEnabledSync = createIsNightshiftEnabledSync(core.getStartServices);
    plugins.alerting?.enableAlertStatusChanged({
      isEnabled: async () => isNightshiftEnabledSync(),
    });
    // Single choke point for sandbox access: tools and workflow steps resolve the sandbox through
    // this, so nothing can reach the sandbox service while `nightshift.enabled` is off.
    const getGatedSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => this.sandboxStart,
      isNightshiftEnabled: isNightshiftEnabledSync,
    });
    const telemetry = setupNightshiftTelemetry({
      analytics: core.analytics,
      logger: this.logger.get('telemetry'),
    });

    this.cortexEnabled = this.ctx.config.get().cortex.enabled;
    this.memoryEnabled = this.ctx.config.get().memory.enabled;
    if (this.cortexEnabled) {
      registerCortexAiIndex(plugins.contextEngine, this.logger.get('cortex'));
      registerCortexTelemetryEvents(core.analytics);
    }
    if (this.memoryEnabled) {
      registerMemoryAiIndex(plugins.contextEngine, this.logger.get('memory'));
    }

    this.decisionTreesEnabled =
      this.ctx.config.get().decision_trees.enabled &&
      this.cortexEnabled &&
      Boolean(plugins.sandbox?.isAvailable);
    if (this.decisionTreesEnabled) {
      registerDecisionTreeAiIndex(plugins.contextEngine, this.logger.get('decision_trees'));
    }

    core.savedObjects.registerType(nightshiftAutomationSavedObjectType);
    core.savedObjects.registerType(nightshiftAutomationBudgetSavedObjectType);
    core.savedObjects.registerType(nightshiftCustomContextSavedObjectType);

    const customContextClient = createCustomContextClient({
      getDeps: () => ({
        featureFlags: this.featureFlags,
        savedObjects: this.savedObjects,
        security: this.security,
        securityPlugin: this.securityStart,
        spaces: this.spaces,
      }),
    });

    const onboardingClient = createOnboardingClient({
      getDeps: () => ({
        workflowsManagement: this.workflowsManagement,
        spaces: this.spaces,
        agentBuilder: this.agentBuilder,
        agentAvailability: this.getInvestigationAvailability(),
      }),
      logger: this.logger.get('onboarding'),
    });

    const listSandboxConnectors = createListSandboxConnectors({
      getActions: () => this.actionsStart,
    });
    const listSandboxConnectorTypes = createListSandboxConnectorTypes({
      getActions: () => this.actionsStart,
    });

    const getTriggerEmitter = (request: KibanaRequest): TriggerEmitter | undefined =>
      createTriggerEmitter({
        workflowsExtensions: this.workflowsExtensionsStart,
        request,
        logger: this.logger,
      });

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
    );

    if (plugins.agentBuilder) {
      notificationRoutingAttachment.registerAttachmentType(plugins.agentBuilder, {
        getService: () => this.getNotificationRoutingService(),
        assertCanRead: async () => {},
        assertCanReadConversation: async (request, conversationId) => {
          if (!this.agentBuilder) {
            throw new Error('agentBuilder is not available');
          }
          const conversations = await this.agentBuilder.conversations.getScopedClient({ request });
          await conversations.get(conversationId);
        },
        logger: this.logger,
      });
      const config = this.ctx.config.get();
      const telemetryConnectorId = config.sandbox?.telemetry_connector_id;
      const nightshiftAgentOptions: NightshiftAgentTypeOptions = {
        sandboxEnabled: plugins.sandbox?.isAvailable ?? false,
        cortexEnabled: this.cortexEnabled,
        memoryEnabled: this.memoryEnabled,
        investigationToolsEnabled: Boolean(plugins.agenticInvestigations),
        proposalsEnabled: Boolean(plugins.proposals),
        telemetryConnectorId,
        getCustomContextInstructions: ({ request, spaceId }) =>
          customContextClient.getInstructions(request, spaceId),
        logger: this.logger.get('custom_context'),
      };
      registerInvestigationAgentType(plugins.agentBuilder, {
        ...nightshiftAgentOptions,
        telemetryConfig: config.sandbox,
        decisionTreesEnabled: this.decisionTreesEnabled,
      });
      if (this.decisionTreesEnabled) {
        registerDecisionTreeReinforcementAgentType(plugins.agentBuilder);
      }
      if (plugins.sandbox?.isAvailable) {
        registerAssistantAgentType(plugins.agentBuilder, nightshiftAgentOptions);
        this.assistantEnabled = true;
      }

      if (plugins.sandbox?.isAvailable) {
        const sandboxLogger = this.logger.get('sandbox');

        // Tools are registered in setup() but only run after start(), so read start deps lazily.
        const getSandboxStart = getGatedSandboxStart;
        const sandboxWorkspaceManager = createSandboxWorkspaceManager({
          getDeps: () => ({ actions: this.actionsStart }),
          telemetryConnectorId,
          telemetryReadableIndices: config.sandbox?.telemetry_readable_indices,
          telemetryTargets: getTelemetryTargets(config.sandbox),
          getTelemetryTarget: async ({ agentId, conversationId, request }) => {
            if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) return undefined;
            if (!conversationId) throw new Error('Investigation telemetry requires a conversation');
            return this.getInvestigationsClient(request).getTelemetryTarget(conversationId);
          },
          logger: sandboxLogger,
        });
        const resolveConnectorCredentials = createConnectorCredentialResolver({
          getDeps: () => ({ actions: this.actionsStart }),
          logger: sandboxLogger.get('connector_credentials'),
        });
        const outputRedactionLogger = sandboxLogger.get('output_redaction');
        const redaction = {
          prepareCallContext: sandboxWorkspaceManager.prepareCallContext,
          getOutputRedactor: createSandboxOutputRedactorProvider({
            getDeps: () => ({ actions: this.actionsStart }),
          }),
          logger: outputRedactionLogger,
        };
        const availability = createSandboxToolAvailability({
          getDeps: () => ({ featureFlags: this.featureFlags, security: this.securityStart }),
        });
        const { agentBuilder } = plugins;
        const registerSandboxTool = <TSchema extends ZodObject>(
          tool: BuiltinToolDefinition<TSchema>
        ) =>
          agentBuilder.tools.register({
            ...withSandboxOutputRedaction(tool, redaction),
            availability,
          });

        registerSandboxTool(
          createSandboxBashTool({
            getSandboxStart,
            sandboxWorkspaceManager,
            resolveConnectorCredentials,
            logger: sandboxLogger,
          })
        );
        registerSandboxTool(
          createSandboxViewFileTool({
            getSandboxStart,
            sandboxWorkspaceManager,
            logger: sandboxLogger,
          })
        );
        registerSandboxTool(
          createSandboxStrReplaceTool({
            getSandboxStart,
            sandboxWorkspaceManager,
            logger: sandboxLogger,
          })
        );
        registerSandboxTool(
          createSandboxWriteFileTool({
            getSandboxStart,
            sandboxWorkspaceManager,
            logger: sandboxLogger,
          })
        );

        if (this.decisionTreesEnabled) {
          const decisionTreeLogger = this.logger.get('decision_trees');
          const getSpaceId = (request: KibanaRequest) =>
            this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
          for (const tool of createDecisionTreeTools({
            getSandboxStart,
            connectorNames: getTelemetryTargets(config.sandbox).flatMap(({ connectorId }) =>
              connectorId ? [connectorId] : []
            ),
            getSpaceId,
            getUsername: (req: KibanaRequest) => this.security?.authc.getCurrentUser(req)?.username,
            logger: decisionTreeLogger,
          })) {
            plugins.agentBuilder.tools.register(tool);
          }
        }
      }
    }

    if (plugins.workflowsManagement) {
      if (plugins.workflowsExtensions) {
        plugins.workflowsExtensions.registerStepDefinition(
          triggerInvestigationStepDefinition(
            this.getInvestigationsClient,
            this.getAutomationsSoClient,
            this.getAlertsClient,
            this.getEpisodeLookup,
            () => this.actionsStart,
            settingsLocator
          )
        );
        plugins.workflowsExtensions.registerStepDefinition(
          followUpRecoveredAlertStepDefinition(this.getInvestigationsClient)
        );
        plugins.workflowsExtensions.registerStepDefinition(
          classifyOnlineEvalsRoundStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            isEvalsAvailable: () => this.evals !== undefined,
            isPaused: createIsOnlineEvalsPaused(core.getStartServices),
          })
        );
        // `agentBuilder` is only available from `start()`, so the step resolves it lazily.
        plugins.workflowsExtensions.registerStepDefinition(
          ensureInvestigationAgentStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            getAgentAvailability: () => this.getInvestigationAvailability(),
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          resolveModelStepDefinition({
            getInference: () => this.inference,
            getSavedObjects: () => this.savedObjects,
            getUiSettings: () => this.uiSettings,
            logger: this.logger.get('resolve_model'),
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          sendNotificationsStepDefinition({
            investigationLocator,
            getInvestigationsClient: this.getInvestigationsClient,
            getActions: () => this.actionsStart,
            getRoutingClient: this.getNotificationRoutingClient,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          handleInvestigationFailureStepDefinition({
            investigationLocator,
            getInvestigationsClient: this.getInvestigationsClient,
            getActions: () => this.actionsStart,
            getRoutingClient: this.getNotificationRoutingClient,
            getTriggerEmitter,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          renderSlackMessageStepDefinition({
            investigationLocator,
            getInvestigationsClient: this.getInvestigationsClient,
          })
        );
        // Registered even when disabled: the combined workflow no-ops a writer branch instead
        // of failing on an unknown step type, and obtain runs first to hand both writers a sandbox.
        plugins.workflowsExtensions.registerStepDefinition(
          obtainSandboxStepDefinition({
            getSandboxStart: getGatedSandboxStart,
            logger: this.logger.get('sandbox'),
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          cortexHydrateStepDefinition({
            getSandboxStart: getGatedSandboxStart,
            analytics: core.analytics,
            logger: this.logger.get('cortex'),
            isEnabled: () => this.cortexEnabled,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          memoryMaterializeToSandboxStepDefinition({
            getSandboxStart: getGatedSandboxStart,
            logger: this.logger.get('memory'),
            isEnabled: () => this.memoryEnabled,
            telemetry,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          composeHydrateNotificationsStepDefinition()
        );
        // Registered unconditionally: the combined materialize workflow installs with Cortex
        // or Memory, so a trees-off install would otherwise reference an unknown step type.
        // The handler no-ops on the flag instead, matching cortex/memory above.
        plugins.workflowsExtensions.registerStepDefinition(
          decisionTreeHydrateStepDefinition({
            getSandboxStart: getGatedSandboxStart,
            logger: this.logger.get('decision_trees'),
            isEnabled: () => this.decisionTreesEnabled,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          cortexOptimizeStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            getInference: () => this.inference,
            getSavedObjects: () => this.savedObjects,
            getUiSettings: () => this.uiSettings,
            analytics: core.analytics,
            logger: this.logger.get('cortex'),
            isEnabled: () => this.cortexEnabled,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          memoryOptimizeStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            getInference: () => this.inference,
            getSavedObjects: () => this.savedObjects,
            getUiSettings: () => this.uiSettings,
            logger: this.logger.get('memory'),
            isEnabled: () => this.memoryEnabled,
            telemetry,
          })
        );
        // Registered unconditionally for the same reason as the tree hydrate above: the
        // combined optimize workflow installs with Cortex or Memory and now runs the
        // reinforcement phase too. The handler no-ops on the flag.
        plugins.workflowsExtensions.registerStepDefinition(
          decisionTreePrepareStepDefinition({
            getTelemetryConnectorId: async (request, conversationId) =>
              conversationId
                ? (await this.getInvestigationsClient(request).getTelemetryTarget(conversationId))
                    .connectorId
                : this.ctx.config.get().sandbox?.telemetry_connector_id,
            logger: this.logger.get('decision_trees'),
            isEnabled: () => this.decisionTreesEnabled,
          })
        );
        plugins.workflowsExtensions.registerStepDefinition(
          decisionTreeReinforceStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            isEnabled: () => this.decisionTreesEnabled,
          })
        );
      }

      registerRoutes({
        repository: nightshiftInvestigationsRouteRepository,
        dependencies: {
          getInvestigationsClient: this.getInvestigationsClient,
          getTriggerEmitter,
          getAlertsClient: this.getAlertsClient,
          getEpisodeLookup: this.getEpisodeLookup,
          getAutomationsSoClient: this.getAutomationsSoClient,
          getWorkflowsManagement: () => this.workflowsManagement,
          isCortexEnabled: () => this.cortexEnabled,
          listSandboxConnectors,
          listSandboxConnectorTypes,
          customContextClient,
          onboardingClient,
          getCortexPageStore: (request: KibanaRequest) => {
            if (!this.elasticsearch) {
              throw new Error(
                'elasticsearch is not available — plugin start() has not been called'
              );
            }
            return createCortexStore({
              esClient: this.elasticsearch.client.asScoped(request).asCurrentUser,
              logger: this.logger.get('cortex'),
              spaceId: this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
            });
          },
          isDecisionTreesEnabled: () => this.decisionTreesEnabled,
          getDecisionTreeStore: (request: KibanaRequest) => {
            if (!this.elasticsearch) {
              throw new Error(
                'elasticsearch is not available — plugin start() has not been called'
              );
            }
            return createDecisionTreeStore({
              esClient: this.elasticsearch.client.asScoped(request).asCurrentUser,
              logger: this.logger.get('decision_trees'),
              spaceId: this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
            });
          },
          isMemoryEnabled: () => this.memoryEnabled,
          getInvestigatorServiceAccountService: this.getInvestigatorServiceAccountService,
          getSpaceId: (request: KibanaRequest) =>
            this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
          getMemoryPageStore: (request: KibanaRequest) => {
            if (!this.elasticsearch) {
              throw new Error(
                'elasticsearch is not available — plugin start() has not been called'
              );
            }
            return createMemoryPageStore({
              esClient: this.elasticsearch.client.asScoped(request).asCurrentUser,
              logger: this.logger.get('memory'),
              spaceId: this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
            });
          },
          getKnowledgePurgeClient: (request: KibanaRequest) => {
            if (!this.elasticsearch) {
              throw new Error(
                'elasticsearch is not available — plugin start() has not been called'
              );
            }
            return createKnowledgePurgeClient({
              esClient: this.elasticsearch.client.asScoped(request).asCurrentUser,
              logger: this.logger.get('purge'),
              spaceId: this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
              getConversations: async () =>
                this.agentBuilder?.conversations.getScopedClient({ request }),
            });
          },
        },
        core,
        logger: this.logger,
        runDevModeChecks: false,
      });
    } else {
      this.logger.warn(
        'workflowsManagement is not available — nightshift investigations routes will not be registered'
      );
    }

    return {
      registerInvestigationQuota: (callback) => {
        if (this.investigationQuotaCallback) {
          throw new Error('Investigation quota callback is already registered');
        }
        this.investigationQuotaCallback = callback;
      },
    };
  }

  start(
    coreStart: CoreStart,
    plugins: NightshiftInvestigationsStartDeps
  ): NightshiftInvestigationsServerStart {
    this.spaces = plugins.spaces;
    this.workflowsExtensionsStart = plugins.workflowsExtensions;
    this.agentBuilder = plugins.agentBuilder;
    this.agenticInvestigations = plugins.agenticInvestigations;
    this.proposals = plugins.proposals;
    this.evals = plugins.evals;
    this.inference = plugins.inference;
    this.sandboxStart = plugins.sandbox;
    this.ruleRegistry = plugins.ruleRegistry;
    this.alertingVTwo = plugins.alertingVTwo;
    this.elasticsearch = coreStart.elasticsearch;
    this.savedObjects = coreStart.savedObjects;
    this.uiSettings = coreStart.uiSettings;
    this.featureFlags = coreStart.featureFlags;
    this.actionsStart = plugins.actions;
    this.securityStart = plugins.security;
    this.security = coreStart.security;
    this.coreStart = coreStart;
    this.notificationRoutingService = notificationRoutingAttachment.createService({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger,
    });

    // Installed here so the agent is visible in the Agent Builder UI before the first run.
    if (plugins.agentBuilder) {
      const { agentBuilder } = plugins;
      void installInvestigationAgent({
        agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
        availability: this.getInvestigationAvailability(),
      }).catch((err) => {
        this.logger.error(`Failed to install investigation agent in default space: ${err.message}`);
      });
      if (this.assistantEnabled) {
        void installAssistantAgent({
          agentBuilder,
          spaceId: DEFAULT_SPACE_ID,
          availability: this.getInvestigationAvailability(),
        }).catch((err) => {
          this.logger.error(`Failed to install assistant agent in default space: ${err.message}`);
        });
      }
    }

    if (plugins.workflowsExtensions) {
      this.managedWorkflowsClient = plugins.workflowsExtensions.initManagedWorkflowsClient(
        NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
      );
      this.installManagedWorkflows(this.managedWorkflowsClient).catch((err) => {
        this.logger.error(
          `Failed to install nightshift investigations managed workflows: ${err.message}`
        );
      });
    }

    return {
      getInvestigationsClient: this.getInvestigationsClient,
      isInvestigationAvailable: (request) =>
        isInvestigationRunAvailable({
          request,
          featureFlags: coreStart.featureFlags,
          agentBuilder: this.agentBuilder,
          inference: this.inference,
          agenticInvestigations: this.agenticInvestigations,
          proposals: this.proposals,
          logger: this.logger,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
          isServiceAccountExecutionEnabled: this.isServiceAccountExecutionEnabled,
        }),
      isAssistantEnabled: () => this.assistantEnabled,
    };
  }

  /** Created once so every `agents.ensure` call registers the same gate; deps read lazily. */
  private getInvestigationAvailability = (): AvailabilityConfig => {
    this.investigationAvailability ??= createInvestigationAvailability({
      getDeps: () => {
        if (!this.featureFlags) {
          return undefined;
        }
        return {
          featureFlags: this.featureFlags,
          agentBuilder: this.agentBuilder,
          inference: this.inference,
          agenticInvestigations: this.agenticInvestigations,
          proposals: this.proposals,
          logger: this.logger,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
          isServiceAccountExecutionEnabled: this.isServiceAccountExecutionEnabled,
        };
      },
    });
    return this.investigationAvailability;
  };

  private getInvestigationsClient = (request: KibanaRequest, spaceId?: string) => {
    if (!this.featureFlags) {
      throw new Error('featureFlags is not available — plugin start() has not been called');
    }
    const resolvedSpaceId =
      spaceId ?? this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    return new NightshiftInvestigationsClient({
      request,
      telemetryConfig: this.ctx.config.get().sandbox,
      workflowsManagement: this.workflowsManagement,
      spaces: this.spaces,
      logger: this.logger,
      spaceIdOverride: spaceId,
      agentBuilder: this.agentBuilder,
      agenticInvestigations: this.agenticInvestigations,
      agentAvailability: this.getInvestigationAvailability(),
      assistantEnabled: this.assistantEnabled,
      investigationQuotaCallback: this.investigationQuotaCallback,
      inference: this.inference,
      savedObjects: this.savedObjects,
      uiSettings: this.uiSettings,
      isServiceAccountExecutionEnabled: this.isServiceAccountExecutionEnabled,
      isAvailable: (connectorId) =>
        isInvestigationRunAvailable({
          request,
          featureFlags: this.featureFlags!,
          agentBuilder: this.agentBuilder,
          inference: this.inference,
          agenticInvestigations: this.agenticInvestigations,
          proposals: this.proposals,
          logger: this.logger,
          connectorId,
          spaceId: resolvedSpaceId,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
          isServiceAccountExecutionEnabled: this.isServiceAccountExecutionEnabled,
        }),
      isInfrastructureAvailable: () =>
        isInvestigationInfrastructureAvailable({
          request,
          featureFlags: this.featureFlags!,
          agentBuilder: this.agentBuilder,
          inference: this.inference,
          agenticInvestigations: this.agenticInvestigations,
          proposals: this.proposals,
          logger: this.logger,
          spaceId: resolvedSpaceId,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
          isServiceAccountExecutionEnabled: this.isServiceAccountExecutionEnabled,
        }),
    });
  };

  private isServiceAccountExecutionEnabled = (): boolean =>
    this.security?.serviceAccounts.isEnabled() ?? false;

  /** One instance, so setups of a space queue behind each other across requests. */
  private getInvestigatorServiceAccountService = (): InvestigatorServiceAccountService => {
    if (this.investigatorServiceAccountService) {
      return this.investigatorServiceAccountService;
    }
    if (!this.coreStart || !this.workflowsExtensionsStart) {
      throw new Error('workflowsExtensions is not available — plugin start() has not been called');
    }
    this.investigatorServiceAccountService = createInvestigatorServiceAccountService({
      core: this.coreStart,
      workflowsExtensions: this.workflowsExtensionsStart,
      workflowsManagement: this.workflowsManagement,
      getInstalledWorkflowState: async (workflowId, spaceId) => {
        const client = await this.managedWorkflowsClient;
        return client ? client.getInstalledWorkflowState(workflowId, spaceId) : null;
      },
      spaces: this.spaces,
      getAutomationsSoClient: this.getAutomationsSoClient,
      isServerless: this.ctx.env.packageInfo.buildFlavor === 'serverless',
      logger: this.logger.get('service_account'),
    });
    return this.investigatorServiceAccountService;
  };

  private getNotificationRoutingService =
    (): InvestigationAttachmentDocService<StoredNotificationRouting> => {
      if (!this.notificationRoutingService) {
        throw new Error('Notification routing storage is not available');
      }
      return this.notificationRoutingService;
    };

  private getNotificationRoutingClient = async (
    request: KibanaRequest,
    spaceId: string,
    conversationId: string,
    investigationId: string
  ): Promise<NotificationRoutingClient> => {
    if (!this.agentBuilder) {
      throw new Error('agentBuilder is not available');
    }
    if (request.spaceId !== spaceId) {
      throw new Error('Notification request and execution spaces do not match');
    }
    const [attachments, conversations] = await Promise.all([
      this.agentBuilder.attachments.getScopedClient({ request }),
      this.agentBuilder.conversations.getScopedClient({ request }),
    ]);
    return new NotificationRoutingClient({
      service: this.getNotificationRoutingService(),
      attachments,
      conversations,
      spaceId,
      conversationId,
      investigationId,
    });
  };

  private getAlertsClient = (request: KibanaRequest) =>
    this.ruleRegistry?.getRacClientWithRequest(request);

  private getEpisodeLookup: GetEpisodeLookup = (request, spaceId) => {
    const { elasticsearch, alertingVTwo } = this;
    if (!elasticsearch) {
      throw new Error('core services are not available — plugin start() has not been called');
    }
    const resolvedSpaceId =
      spaceId ?? this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    return {
      esClient: elasticsearch.client.asScoped(request).asCurrentUser,
      getRulesClient: alertingVTwo
        ? () => alertingVTwo.getRulesClientWithRequestInSpace(request, asSpaceId(resolvedSpaceId))
        : undefined,
      spaceId: resolvedSpaceId,
    };
  };

  private getAutomationsSoClient = (request: KibanaRequest, spaceId: string) => {
    if (!this.savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    return this.savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_AUTOMATION_SO_TYPE, NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE],
      })
      .asScopedToNamespace(spaceId);
  };

  /**
   * Installs the static managed workflows this plugin owns and signals readiness so the
   * platform can reconcile (prune orphans / apply upgrades) for this plugin's workflows.
   */
  private async installManagedWorkflows(
    managedWorkflowsClient: Promise<ManagedWorkflowsClient>
  ): Promise<void> {
    const client = await managedWorkflowsClient;
    // Each space reaches the global investigation through an entry point bound to the Nightshift
    // service account, installed with the bound Slack thread workflow when an admin sets the space
    // up (see lib/service_account). Not installing the Slack thread's global copy here lets
    // ready() remove any left from earlier versions.
    await installInvestigationWorkflow({ client });
    await client.install(NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    if (this.cortexEnabled || this.memoryEnabled) {
      await installSandboxMaterializeWorkspaceWorkflow({ client });
      await installAgentOptimizationsWorkflow({ client });
    }
    if (this.decisionTreesEnabled) {
      await installDecisionTreeWorkflows({ client });
    }
    await client.ready();
  }

  stop(): void {}
}
