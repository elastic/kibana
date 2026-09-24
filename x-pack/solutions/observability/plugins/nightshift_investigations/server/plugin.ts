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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AvailabilityConfig } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { NightshiftInvestigationsConfig } from './config';
import { NightshiftInvestigationsClient } from './client/investigations_client';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from './lib/managed_workflows/constants';
import { installInvestigationWorkflow } from './lib/managed_workflows/install_investigation_workflow';
import { installCortexWorkflows } from './lib/managed_workflows/install_cortex_workflows';
import { installDecisionTreeWorkflows } from './lib/managed_workflows/install_decision_tree_workflows';
import { installInvestigationAgent } from './lib/install_investigation_agent';
import { installDeductiveInvestigationAgent } from './lib/install_deductive_investigation_agent';
import { createInvestigationAvailability } from './create_investigation_availability';
import { nightshiftInvestigationsRouteRepository } from './routes';
import { isInvestigationAvailable } from './is_investigation_available';
import { ensureInvestigationAgentStepDefinition } from './step_definitions/ensure_investigation_agent';
import { triggerInvestigationStepDefinition } from './step_definitions/trigger_investigation';
import { cortexHydrateStepDefinition } from './step_definitions/cortex_hydrate';
import { cortexOptimizeStepDefinition } from './step_definitions/cortex_optimize';
import { decisionTreeHydrateStepDefinition } from './step_definitions/decision_tree_hydrate';
import { decisionTreePrepareStepDefinition } from './step_definitions/decision_tree_prepare';
import { createCortexStore, registerCortexAiIndex } from './cortex/register_cortex';
import { createDecisionTreeStore } from './decision_trees/store';
import { registerDecisionTreeAiIndex } from './decision_trees/register_decision_trees';
import { createTriggerEmitter, type TriggerEmitter } from './workflows/triggers/emit';
import { registerInvestigationsWorkflowTriggers } from './workflows/triggers/register_triggers';
import { registerInvestigationAgentType } from './agents/investigation';
import { registerDeductiveInvestigationAgentType } from './agents/deductive_investigation';
import { registerDecisionTreeReinforcementAgentType } from './agents/decision_tree_reinforcement';
import { createDecisionTreeTools } from './tools/decision_tree';
import { createInvestigationProgressReportTool } from './tools/investigation_progress_report/tool';
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
  nightshiftInvestigationSavedObjectType,
  nightshiftSecretsEncryptionParams,
  nightshiftSecretsSavedObjectType,
  NIGHTSHIFT_INVESTIGATION_SO_TYPE,
} from './saved_objects';
import { createSandboxSecretsClient } from './sandbox_secrets';
import { SavedObjectInvestigationRepository } from './storage';
import {
  registerInvestigationReconciliationTask,
  scheduleInvestigationReconciliationTask,
} from './tasks/investigation_reconciliation_task';
import type {
  InvestigationQuotaCallback,
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';

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
  private sandboxStart?: NightshiftInvestigationsStartDeps['sandbox'];
  private searchInferenceEndpoints?: NightshiftInvestigationsStartDeps['searchInferenceEndpoints'];
  private ruleRegistry?: NightshiftInvestigationsStartDeps['ruleRegistry'];
  private inference?: NightshiftInvestigationsStartDeps['inference'];
  private elasticsearch?: ElasticsearchServiceStart;
  private savedObjects?: CoreStart['savedObjects'];
  private featureFlags?: CoreStart['featureFlags'];
  private actionsStart?: ActionsPluginStart;
  private encryptedSavedObjectsStart?: NightshiftInvestigationsStartDeps['encryptedSavedObjects'];
  private securityStart?: NightshiftInvestigationsStartDeps['security'];
  private security?: CoreStart['security'];
  private investigationAvailability?: AvailabilityConfig;
  private cortexEnabled = false;
  private investigationQuotaCallback?: InvestigationQuotaCallback;
  private decisionTreesEnabled = false;

  constructor(private readonly ctx: PluginInitializerContext<NightshiftInvestigationsConfig>) {
    this.logger = ctx.logger.get();
  }

  setup(
    core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>,
    plugins: NightshiftInvestigationsSetupDeps
  ): NightshiftInvestigationsServerSetup {
    // Core gates the plugin on xpack.nightshift_investigations.enabled.
    this.workflowsManagement = plugins.workflowsManagement;
    registerInvestigationsWorkflowTriggers(plugins.workflowsExtensions);

    this.cortexEnabled = this.ctx.config.get().cortex.enabled;
    if (this.cortexEnabled) {
      registerCortexAiIndex(plugins.contextEngine, this.logger.get('cortex'));
    }

    // Decision trees are edited in the sandbox and read the Cortex investigator context, so the
    // feature only works when Cortex and the sandbox are both configured.
    this.decisionTreesEnabled =
      this.ctx.config.get().decision_trees.enabled &&
      this.cortexEnabled &&
      Boolean(plugins.sandbox?.isAvailable);
    if (this.decisionTreesEnabled) {
      registerDecisionTreeAiIndex(plugins.contextEngine, this.logger.get('decision_trees'));
    }

    core.savedObjects.registerType(nightshiftInvestigationSavedObjectType);
    core.savedObjects.registerType(nightshiftSecretsSavedObjectType);
    plugins.encryptedSavedObjects?.registerType(nightshiftSecretsEncryptionParams);

    const sandboxSecretsClient = createSandboxSecretsClient({
      getDeps: () => ({
        featureFlags: this.featureFlags,
        savedObjects: this.savedObjects,
        encryptedSavedObjects: this.encryptedSavedObjectsStart,
        security: this.securityStart,
        spaces: this.spaces,
      }),
      canEncrypt: plugins.encryptedSavedObjects?.canEncrypt ?? false,
      logger: this.logger.get('sandbox_secrets'),
    });

    registerInvestigationReconciliationTask({
      core,
      taskManager: plugins.taskManager,
      logger: this.logger.get('investigation_reconciliation'),
      getWorkflowsManagement: () => this.workflowsManagement,
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
      const config = this.ctx.config.get();
      const telemetryConnectorId = config.sandbox?.telemetry_connector_id;
      // The significant-events investigator keeps its own prompt and Elastic tools; only the
      // deductive agent runs from the sandbox and talks to Cortex.
      registerInvestigationAgentType(plugins.agentBuilder);
      registerDeductiveInvestigationAgentType(plugins.agentBuilder, {
        sandboxEnabled: plugins.sandbox?.isAvailable ?? false,
        cortexEnabled: this.cortexEnabled,
        decisionTreesEnabled: this.decisionTreesEnabled,
        telemetryConnectorId,
      });
      if (this.decisionTreesEnabled) {
        registerDecisionTreeReinforcementAgentType(plugins.agentBuilder);
      }
      plugins.agentBuilder.tools.register(
        createInvestigationProgressReportTool({
          logger: this.logger.get('investigation_progress_report_tool'),
          availability: this.getInvestigationAvailability(),
        })
      );

      if (plugins.sandbox?.isAvailable) {
        const sandboxLogger = this.logger.get('sandbox');

        // Start deps are read lazily: tools are registered in setup() but only run after start().
        const getSandboxStart = () => this.sandboxStart;
        const sandboxWorkspaceManager = createSandboxWorkspaceManager({
          getDeps: () => ({ actions: this.actionsStart, sandboxSecretsClient }),
          telemetryConnectorId,
          logger: sandboxLogger,
        });
        const resolveConnectorCredentials = createConnectorCredentialResolver({
          getDeps: () => ({ actions: this.actionsStart }),
          logger: sandboxLogger.get('connector_credentials'),
        });
        const redaction = {
          getOutputRedactor: createSandboxOutputRedactorProvider({
            getDeps: () => ({ actions: this.actionsStart, sandboxSecretsClient }),
          }),
          logger: sandboxLogger.get('output_redaction'),
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
            sandboxSecretsClient,
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
            connectorNames: telemetryConnectorId ? [telemetryConnectorId] : [],
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
          triggerInvestigationStepDefinition(this.getInvestigationsClient)
        );
        // `agentBuilder` is only available from `start()`, so the step resolves it lazily.
        plugins.workflowsExtensions.registerStepDefinition(
          ensureInvestigationAgentStepDefinition({
            getAgentBuilder: () => this.agentBuilder,
            getAgentAvailability: () => this.getInvestigationAvailability(),
          })
        );
        if (this.cortexEnabled) {
          plugins.workflowsExtensions.registerStepDefinition(
            cortexHydrateStepDefinition({
              getSandboxStart: () => this.sandboxStart,
              logger: this.logger.get('cortex'),
            })
          );
          plugins.workflowsExtensions.registerStepDefinition(
            cortexOptimizeStepDefinition({
              getInference: () => this.inference,
              getSearchInferenceEndpoints: () => this.searchInferenceEndpoints,
              logger: this.logger.get('cortex'),
            })
          );
        }
        if (this.decisionTreesEnabled) {
          const decisionTreeLogger = this.logger.get('decision_trees');
          plugins.workflowsExtensions.registerStepDefinition(
            decisionTreeHydrateStepDefinition({
              getSandboxStart: () => this.sandboxStart,
              logger: decisionTreeLogger,
            })
          );
          plugins.workflowsExtensions.registerStepDefinition(
            decisionTreePrepareStepDefinition({
              getTelemetryConnectorId: () => this.ctx.config.get().sandbox?.telemetry_connector_id,
              logger: decisionTreeLogger,
            })
          );
        }
      }

      registerRoutes({
        repository: nightshiftInvestigationsRouteRepository,
        dependencies: {
          getInvestigationsClient: this.getInvestigationsClient,
          getTriggerEmitter,
          getAlertsClient: (request: KibanaRequest) =>
            this.ruleRegistry?.getRacClientWithRequest(request),
          isCortexEnabled: () => this.cortexEnabled,
          sandboxSecretsClient,
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
    this.sandboxStart = plugins.sandbox;
    this.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
    this.ruleRegistry = plugins.ruleRegistry;
    this.inference = plugins.inference;
    this.elasticsearch = coreStart.elasticsearch;
    this.savedObjects = coreStart.savedObjects;
    this.featureFlags = coreStart.featureFlags;
    this.actionsStart = plugins.actions;
    this.encryptedSavedObjectsStart = plugins.encryptedSavedObjects;
    this.securityStart = plugins.security;
    this.security = coreStart.security;

    // The `nightshift.ensureInvestigationAgent` workflow step is the general guarantee that the
    // agent exists wherever an investigation runs. This narrower install exists so the agent is
    // visible and editable in the Agent Builder UI before the first investigation ever runs.
    if (plugins.agentBuilder) {
      const { agentBuilder } = plugins;
      void installInvestigationAgent({
        agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
        availability: this.getInvestigationAvailability(),
      }).catch((err) => {
        this.logger.error(`Failed to install investigation agent in default space: ${err.message}`);
      });

      // Availability for a persisted agent is held in memory and only registered by `ensure`, so
      // an agent that is merely persisted is listed with no gate at all. The deductive agent is
      // otherwise only ensured once an investigation runs, which cannot happen while the feature
      // is off — without this call it would stay visible after a restart with `nightshift.enabled`
      // disabled.
      void installDeductiveInvestigationAgent({
        agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
        availability: this.getInvestigationAvailability(),
      }).catch((err) => {
        this.logger.error(
          `Failed to install deductive investigation agent in default space: ${err.message}`
        );
      });
    }

    if (plugins.workflowsExtensions) {
      this.installManagedWorkflows(plugins.workflowsExtensions).catch((err) => {
        this.logger.error(
          `Failed to install nightshift investigations managed workflows: ${err.message}`
        );
      });
    }

    if (this.workflowsManagement) {
      scheduleInvestigationReconciliationTask({ taskManager: plugins.taskManager }).catch((err) => {
        this.logger.error(`Failed to schedule investigation reconciliation task: ${err.message}`);
      });
    }

    return {
      getInvestigationsClient: this.getInvestigationsClient,
      isInvestigationAvailable: (request) =>
        isInvestigationAvailable({
          request,
          featureFlags: coreStart.featureFlags,
          agentBuilder: this.agentBuilder,
          logger: this.logger,
          searchInferenceEndpoints: this.searchInferenceEndpoints,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
        }),
    };
  }

  /**
   * Created once and reused so every `agents.ensure` call for these agent ids registers the same
   * gate. Dependencies are read lazily because the tool and the workflow step are registered at
   * setup, while availability is only evaluated once a request arrives.
   */
  private getInvestigationAvailability = (): AvailabilityConfig => {
    this.investigationAvailability ??= createInvestigationAvailability({
      getDeps: () => {
        if (!this.featureFlags) {
          return undefined;
        }
        return {
          featureFlags: this.featureFlags,
          agentBuilder: this.agentBuilder,
          logger: this.logger,
          searchInferenceEndpoints: this.searchInferenceEndpoints,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
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
      workflowsManagement: this.workflowsManagement,
      spaces: this.spaces,
      logger: this.logger,
      spaceIdOverride: spaceId,
      agentBuilder: this.agentBuilder,
      agentAvailability: this.getInvestigationAvailability(),
      investigationQuotaCallback: this.investigationQuotaCallback,
      investigationRepository: this.createInvestigationRepository(request, resolvedSpaceId),
      isAvailable: () =>
        isInvestigationAvailable({
          request,
          featureFlags: this.featureFlags!,
          agentBuilder: this.agentBuilder,
          logger: this.logger,
          searchInferenceEndpoints: this.searchInferenceEndpoints,
          spaceId: resolvedSpaceId,
          spaces: this.spaces,
          workflowsExtensions: this.workflowsExtensionsStart,
          workflowsManagement: this.workflowsManagement,
        }),
    });
  };

  private createInvestigationRepository = (
    request: KibanaRequest,
    spaceId: string
  ): SavedObjectInvestigationRepository => {
    if (!this.savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    const savedObjectsClient = this.savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_INVESTIGATION_SO_TYPE],
      })
      .asScopedToNamespace(spaceId);
    return new SavedObjectInvestigationRepository({ savedObjectsClient });
  };

  /**
   * Installs the static managed workflows this plugin owns and signals readiness so the
   * platform can reconcile (prune orphans / apply upgrades) for this plugin's workflows.
   */
  private async installManagedWorkflows(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart
  ): Promise<void> {
    const client = await workflowsExtensions.initManagedWorkflowsClient(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER
    );
    await installInvestigationWorkflow({ client });
    if (this.cortexEnabled) {
      await installCortexWorkflows({ client });
    }
    if (this.decisionTreesEnabled) {
      await installDecisionTreeWorkflows({ client });
    }
    await client.ready();
  }

  stop(): void {}
}
