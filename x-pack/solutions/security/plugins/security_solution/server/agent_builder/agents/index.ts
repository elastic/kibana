/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

import { createThreatHuntingAgent } from './threat_hunting_agent';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerAgents = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) => {
  agentBuilder.agents.register(createThreatHuntingAgent(core, logger));
};
