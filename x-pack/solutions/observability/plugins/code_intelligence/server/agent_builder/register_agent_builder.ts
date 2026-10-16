/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

import { createCodeIntelligenceSkill } from './skills/code_intelligence_skill';
import { createCodeIntelligenceTools, type CodeIntelligenceToolDependencies } from './tools';

/** Registers the catalog tools and skill; does nothing when Agent Builder is disabled. */
export const registerAgentBuilder = ({
  agentBuilder,
  ...dependencies
}: CodeIntelligenceToolDependencies & {
  readonly agentBuilder?: Pick<AgentBuilderPluginSetup, 'tools' | 'skills'>;
}): void => {
  if (agentBuilder === undefined) return;
  for (const tool of createCodeIntelligenceTools(dependencies)) {
    agentBuilder.tools.register(tool);
  }
  agentBuilder.skills.register(createCodeIntelligenceSkill());
};
