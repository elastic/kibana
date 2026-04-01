/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 8
import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/discoveries/impl/attack_discovery/generation/types';

import { alertRetrievalBuilderSkill } from './alert_retrieval_builder_skill';

interface RegisterSkillsOptions {
  workflowFetcher?: WorkflowsManagementApi;
}

export const registerSkills = async (
  agentBuilder: AgentBuilderPluginSetup,
  logger: Logger,
  _options?: RegisterSkillsOptions
): Promise<void> => {
  await agentBuilder.skills.register(alertRetrievalBuilderSkill);
  logger.debug(() => 'discoveries: Skills registration complete (placeholder)');
};
