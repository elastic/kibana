/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type {
  WorkflowsExtensionsTasksSetup,
  WorkflowsExtensionsTasksStart,
} from '@kbn/workflows-extensions/server/tasks';
import type { NightshiftInvestigationsConfig } from '../config';
import { config as configDescriptor } from '../config';
import { createIsOnlineEvalsPaused } from '../online_evals/is_online_evals_paused';
import { setupNightshiftTelemetry } from '../telemetry';
import { createTimeConverterTool } from '../tools/time_converter/tool';
import { createTriggerEmitter } from '../workflows/triggers/emit';
import { registerInvestigationsWorkflowTriggers } from '../workflows/triggers/register_triggers';
import { registerNightshiftStepDefinitions } from '../workflows/register_step_definitions';
import { nightshiftInvestigationsBridge } from './bridge';

export const config = configDescriptor;

interface TasksSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsTasksSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

interface TasksStartDeps {
  workflowsExtensions?: WorkflowsExtensionsTasksStart;
  inference?: InferenceTasksStart;
}

/**
 * What a pod cannot give a step: it needs Kibana's investigations client (workflows management,
 * Agent Builder conversations, agentic investigations), which have no tasks entries. The step
 * fails with this instead of running half of its work.
 */
const unavailable =
  (what: string) =>
  (..._args: unknown[]): never => {
    throw new Error(
      `${what} is not available in a task pod; run this Nightshift step in Kibana (it needs ` +
        'workflows management, Agent Builder conversations and agentic investigations).'
    );
  };

/**
 * The Nightshift investigations workflow steps and triggers for a task pod: the same step
 * definitions as Kibana's server entry (see `workflows/register_step_definitions.ts`).
 * Steps that need the investigations client, sandbox-backed agents or notification routing register
 * and fail with an explicit message; the investigator and assistant agent types, the sandbox and
 * decision tree tools, the findings recorder hooks and the notification routing attachment are
 * not registered (they need the sandbox, proposals and agentic investigations plugins).
 */
class NightshiftInvestigationsTasksPlugin
  implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps>
{
  private readonly pluginConfig: NightshiftInvestigationsConfig;
  private start$?: CoreTasksStart;
  private pluginsStart?: TasksStartDeps;

  constructor(private readonly context: PluginInitializerContext<NightshiftInvestigationsConfig>) {
    this.pluginConfig = context.config.get();
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, deps: TasksSetupDeps) {
    // In Kibana the server entry registered all of this already.
    if (nightshiftInvestigationsBridge.getSetup()) return {};

    const logger = this.context.logger.get();
    const { workflowsExtensions, agentBuilder } = deps;
    const cortexEnabled = this.pluginConfig.cortex.enabled;
    const memoryEnabled = this.pluginConfig.memory.enabled;

    registerInvestigationsWorkflowTriggers(workflowsExtensions as never);
    agentBuilder?.tools.register(createTimeConverterTool());
    if (!workflowsExtensions) return {};

    const telemetry = setupNightshiftTelemetry({
      analytics: core.analytics as never,
      logger: logger.get('telemetry'),
    });

    registerNightshiftStepDefinitions(workflowsExtensions, {
      logger,
      analytics: core.analytics,
      telemetry,
      investigationLocator: { getRedirectUrl: unavailable('The investigation locator') as never },
      settingsLocator: { getRedirectUrl: unavailable('The settings locator') } as never,
      getInvestigationsClient: unavailable('The investigations client'),
      getAutomationsSoClient: unavailable('The automations saved objects client'),
      getAlertsClient: () => undefined,
      getEpisodeLookup: unavailable('The episode lookup'),
      getActions: unavailable('The actions plugin for notifications'),
      getRoutingClient: unavailable('The notification routing client') as never,
      getTriggerEmitter: (request) =>
        createTriggerEmitter({
          workflowsExtensions: this.pluginsStart?.workflowsExtensions as never,
          request,
          logger,
        }),
      getAgentBuilder: unavailable('Agent Builder conversations and attachments'),
      getAgentAvailability: unavailable('The investigation agent availability'),
      getInference: () => this.pluginsStart?.inference as never,
      getSavedObjects: () => this.start$?.savedObjects as never,
      getUiSettings: () => this.start$?.uiSettings,
      // No sandbox in a pod: steps see it as not configured.
      getSandboxStart: () => undefined,
      getTelemetryConnectorId: (_request, conversationId) => {
        if (conversationId) unavailable('The investigations client')();
        return this.pluginConfig.sandbox?.telemetry_connector_id;
      },
      isEvalsAvailable: () => false,
      isOnlineEvalsPaused: createIsOnlineEvalsPaused(core.getStartServices as never),
      isCortexEnabled: () => cortexEnabled,
      isMemoryEnabled: () => memoryEnabled,
      isDecisionTreesEnabled: () => false,
    });

    return {};
  }

  start(core: CoreTasksStart, deps: TasksStartDeps) {
    this.start$ = core;
    this.pluginsStart = deps;
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext<NightshiftInvestigationsConfig>) =>
  new NightshiftInvestigationsTasksPlugin(context);
