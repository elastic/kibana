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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server/types';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type {
  WorkflowsExtensionsTasksSetup,
  WorkflowsExtensionsTasksStart,
} from '@kbn/workflows-extensions/server/tasks';
import { registerSignificantEventsPodAgentBuilder } from '../register_pod_agent_builder';
import { registerSignificantEventsWorkflowExtensions } from '../task_runtime';
import { significantEventsBridge } from './bridge';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  workflowsManagement?: unknown;
}

interface TasksStartDeps {
  inference: InferenceTasksStart;
  licensing: LicensingTasksStart;
  security: SecurityTasksStart;
  nightshiftSources: NightshiftSourcesServerStart;
  alertingVTwo: AlertingServerStart;
  workflowsExtensions: WorkflowsExtensionsTasksStart;
}

/**
 * Significant events for a task pod: its workflow steps (`significantEvents.resolveModel`,
 * `significantEvents.classifyDetections`) and triggers, and what it contributes to Agent Builder (tools,
 * attachment types, skills and agent types), registered by the same code as Kibana's `server` entry.
 *
 * Not in a pod: the KI identification skill (it starts workflows through the workflows management API)
 * and the Agent Builder SML types. See `register_pod_agent_builder.ts`.
 */
class SignificantEventsTasksPlugin implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps> {
  private coreStart?: CoreTasksStart;
  private inference?: InferenceTasksStart;
  private pod?: ReturnType<typeof registerSignificantEventsPodAgentBuilder>;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { agentBuilder, workflowsExtensions, workflowsManagement }: TasksSetupDeps
  ) {
    const logger = this.context.logger.get();
    registerSignificantEventsWorkflowExtensions({
      workflowsExtensions,
      getInference: () => this.inference as never,
      getSavedObjects: () => this.coreStart?.savedObjects as never,
      getUiSettings: () => this.coreStart?.uiSettings,
      logger,
    });

    // In Kibana the plugin's `server` entry registered all of this.
    if (significantEventsBridge.getSetup()) return {};

    this.pod = registerSignificantEventsPodAgentBuilder({
      core,
      agentBuilder,
      workflowsManagement,
      logger,
      kibanaVersion: this.context.env.packageInfo.version,
      isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
    });
    return {};
  }

  start(core: CoreTasksStart, deps: TasksStartDeps) {
    this.coreStart = core;
    this.inference = deps.inference;
    this.pod?.start(core, {
      security: deps.security as never,
      licensing: deps.licensing as never,
      inference: deps.inference as never,
      nightshiftSources: deps.nightshiftSources,
      alertingVTwo: deps.alertingVTwo,
      workflowsExtensions: deps.workflowsExtensions as never,
    });
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new SignificantEventsTasksPlugin(context);
