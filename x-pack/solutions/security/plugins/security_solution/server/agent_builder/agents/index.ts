/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { createEntityAgent } from './entity_agent';
import { createAlertsAgent } from './alerts_agent';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerAgents = async (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.agents.register(createAlertsAgent());
  agentBuilder.agents.register(createEntityAgent());
};
