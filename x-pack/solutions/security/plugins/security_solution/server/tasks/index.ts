/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { parseExperimentalConfigValue } from '../../common/experimental_features';
import { registerPodAttachments } from '../agent_builder/attachments/register_pod_attachments';
import { registerPodSkills } from '../agent_builder/skills/register_pod_skills';
import { registerPodTools } from '../agent_builder/tools/register_pod_tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../plugin_contract';
import { registerSecurityWorkflowTriggers } from '../workflows/triggers';
import { registerWorkflowSteps } from '../workflows/step_types/register_workflow_steps';
import type { TasksConfig } from './config';
import { tasksConfigSchema } from './config';

export const config: PluginConfigDescriptor<TasksConfig> = { schema: tasksConfigSchema };

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

/**
 * The part of Security Solution that runs in a task runtime: the workflow steps and triggers, and the
 * agent builder tools, skills and attachment types that only need Elasticsearch, saved objects and
 * UI settings (see `register_pod_*`; Kibana's `server` entry registers the same functions plus the
 * ones that need other plugins). In Kibana both registries are the plugins' own tasks contracts,
 * which ignore registrations the `server` entries already made.
 */
class SecuritySolutionTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  private readonly logger;
  private readonly config: TasksConfig;

  constructor(context: PluginInitializerContext<TasksConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(core: CoreTasksSetup, { workflowsExtensions, agentBuilder }: TasksSetupDeps) {
    registerWorkflowSteps(workflowsExtensions);
    registerSecurityWorkflowTriggers(workflowsExtensions);

    if (!agentBuilder) return;

    const { features: experimentalFeatures } = parseExperimentalConfigValue(
      this.config.enableExperimental
    );
    // The registered code reads `core.getStartServices()[0]` only (Elasticsearch, saved objects, UI
    // settings, base path), all of which a runtime's core start has.
    const securityCore = core as unknown as SecuritySolutionPluginCoreSetupDependencies;

    registerPodTools({
      agentBuilder,
      core: securityCore,
      logger: this.logger,
      experimentalFeatures,
    });
    registerPodAttachments({
      agentBuilder,
      core: securityCore,
      logger: this.logger,
      experimentalFeatures,
    });
    registerPodSkills({ agentBuilder, experimentalFeatures }).catch((error) => {
      this.logger.error(`Error registering security skills: ${error}`);
    });
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext<TasksConfig>) =>
  new SecuritySolutionTasksPlugin(context);
