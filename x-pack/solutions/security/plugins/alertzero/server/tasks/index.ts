/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { Subscription } from 'rxjs';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { TaskManagerTasksStart } from '@kbn/task-manager-plugin/server/tasks';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { TRIAGE_GROUPING_FLAG } from '../alert_triage/constants';
import {
  makeIsConversationUpdatedEnabled,
  registerAlertZeroAgentBuilderContributions,
} from '../agent_builder/register_agent_builder_contributions';
import { createAssertAlertZeroAccess } from '../agent_builder_tools/assert_alertzero_access';
import { ActionsService } from '../services/actions/actions_service';
import { WatchWorkflowsManagementClientImpl } from '../services/watches/watch_workflows_management_client';
import { registerAlertZeroInferenceFeatures } from '../inference_features';
import { makeIsContextEngineEnabled } from '../step_types/is_context_engine_enabled';
import { registerAlertZeroStepDefinitions, registerStepDefinitions } from '../step_types';

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  workflowsManagement: WorkflowsManagementTasksSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
}

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  spaces?: SpacesTasksStart;
  security?: SecurityTasksStart;
}

/** A service a pod does not have, named so the failure says what to look at. */
const unavailableInPod = (what: string) => (): never => {
  throw new Error(`${what} is not available in a task pod: it runs only in Kibana`);
};

/**
 * AlertZero's contributions for a task pod: its workflow steps and its agent builder agent type,
 * attachments, tool, skill and conversation trigger opt-in, registered by the same functions the
 * plugin's `server` entry uses. The steps and tools that read workflows (alert triage, the action
 * catalog) use the workflows management API of its tasks entry. Where a step or the tool needs a
 * service a pod does not have (proposals, agent builder conversations, Fleet, the Hunt services),
 * it is registered and fails with a message naming it. The managed workflow state that
 * `report_worker_outcome` verifies needs service accounts, which a pod does not have.
 */
class AlertZeroTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps> {
  private readonly isServerless: boolean;
  private readonly logger: Logger;
  private taskManager?: TaskManagerTasksStart;
  private triageGroupingFlagSubscription?: Subscription;
  private coreStart?: CoreTasksStart;
  private spaces?: SpacesTasksStart;
  private security?: SecurityTasksStart;
  private triageGroupingEnabled = true;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    {
      workflowsExtensions,
      workflowsManagement,
      agentBuilder,
      searchInferenceEndpoints,
    }: TasksSetupDeps
  ) {
    const logger = this.logger;
    const requireCoreStart = () => {
      if (!this.coreStart) throw new Error('AlertZero tasks have not started');
      return this.coreStart;
    };

    registerAlertZeroInferenceFeatures(searchInferenceEndpoints as never, logger.get('inference'));

    registerAlertZeroStepDefinitions({
      analytics: core.analytics,
      areServiceAccountsEnabled: () => requireCoreStart().security.serviceAccounts.isEnabled(),
      // Managed workflow state and telemetry belong to Kibana: a pod has no telemetry plugin, so
      // the step reports an opted-out cluster, as it does for any cluster without telemetry.
      getManagedWorkflowState: async () => undefined,
      getWorkflowsManagement: () => workflowsManagement.management,
      isTelemetryOptedIn: async () => false,
      logger: logger.get('telemetry'),
      workflowsExtensions,
    });

    // The action catalog is read through the workflows management API, as in Kibana.
    const actionsService = new ActionsService(
      () => new WatchWorkflowsManagementClientImpl(workflowsManagement.management),
      logger.get('actions')
    );
    const stepsLogger = logger.get('steps');
    registerStepDefinitions({
      workflowsExtensions,
      getActionsService: () => actionsService,
      getConversations: unavailableInPod('Agent Builder conversations'),
      resolveChatModel: unavailableInPod(
        'The investigation summary model (Agent Builder conversations)'
      ),
      getProposals: unavailableInPod('Proposals'),
      getHuntServices: unavailableInPod('The Hunt services (proposals, MITRE ATT&CK)'),
      isContextEngineEnabled: makeIsContextEngineEnabled(requireCoreStart as never),
      getInternalEsClient: () => requireCoreStart().elasticsearch.client.asInternalUser,
      getTaskManager: () => this.taskManager!,
      getWorkflowsManagement: () => workflowsManagement.management,
      grouping: {
        getProposals: unavailableInPod('Proposals'),
        getWorkflowsManagement: () => workflowsManagement.management,
        isGroupingEnabled: async () => this.triageGroupingEnabled,
      },
      logger: stepsLogger,
    });

    if (agentBuilder) {
      const getSpacesAccess = async () => ({
        core: requireCoreStart() as never,
        spaces: this.spaces as unknown as SpacesPluginStart,
        isServerless: this.isServerless,
      });
      registerAlertZeroAgentBuilderContributions({
        agentBuilder,
        assertAlertZeroAccess: createAssertAlertZeroAccess(async () => ({
          ...(await getSpacesAccess()),
          // The privilege checks use only `authz.actions` and `checkPrivilegesDynamicallyWithRequest`,
          // which the security tasks contract has.
          security: this.security as unknown as SecurityPluginStart,
        })),
        getActionsService: () => actionsService,
        isConversationUpdatedEnabled: makeIsConversationUpdatedEnabled(getSpacesAccess),
      });
    }
  }

  start(core: CoreTasksStart, { taskManager, spaces, security }: TasksStartDeps) {
    this.coreStart = core;
    this.security = security;
    this.taskManager = taskManager;
    this.spaces = spaces;
    this.triageGroupingFlagSubscription = core.featureFlags
      .getBooleanValue$(TRIAGE_GROUPING_FLAG, true)
      .subscribe((enabled) => {
        this.triageGroupingEnabled = enabled;
      });
  }

  stop() {
    this.triageGroupingFlagSubscription?.unsubscribe();
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new AlertZeroTasksPlugin(context);
