/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';

import { alertRetrievalBuilderSkill } from './alert_retrieval_builder_skill';
import { createAttackDiscoveryGeneratorSkill } from './attack_discovery_generator_skill';
import type { WorkflowExecutionLookup } from './tools/get_attack_discovery_status_tool';
import type { WorkflowFetcher } from './tools/get_workflow_health_check_tool';
import type { RunAttackDiscoveryToolDeps } from './tools/run_attack_discovery_tool';
import { createWorkflowTroubleshootingSkill } from './workflow_troubleshooting_skill';

interface RegisterSkillsOptions {
  getEventLogIndex?: () => Promise<string>;
  runAttackDiscoveryToolDeps?: RunAttackDiscoveryToolDeps;
  workflowExecutionLookup?: WorkflowExecutionLookup;
  workflowFetcher?: WorkflowFetcher;
}

/**
 * Registers all Attack Discovery agent builder skills with the agentBuilder plugin.
 *
 * Skills registered here become globally available in the agent builder,
 * including from the security_solution context.
 */
export const registerSkills = async (
  agentBuilder: AgentBuilderPluginSetup,
  logger: Logger,
  options?: RegisterSkillsOptions
): Promise<void> => {
  await agentBuilder.skills.register(alertRetrievalBuilderSkill);

  if (options?.getEventLogIndex != null && options.workflowExecutionLookup != null) {
    await agentBuilder.skills.register(
      createAttackDiscoveryGeneratorSkill({
        getEventLogIndex: options.getEventLogIndex,
        runAttackDiscoveryToolDeps: options.runAttackDiscoveryToolDeps,
        workflowExecutionLookup: options.workflowExecutionLookup,
      })
    );
  } else {
    logger.debug(
      () =>
        'discoveries: getEventLogIndex or workflowExecutionLookup not provided; skipping attack-discovery-generator skill registration'
    );
  }

  if (options?.workflowFetcher != null) {
    await agentBuilder.skills.register(createWorkflowTroubleshootingSkill(options.workflowFetcher));
  }

  logger.debug(() => 'discoveries: Skills registration complete');
};
