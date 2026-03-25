/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

import { createThreatHuntingAgent } from './threat_hunting_agent';
import { createTriageAgent } from './triage_agent';
import { createInvestigatorAgent } from './investigator_agent';
import { createCorrelatorAgent } from './correlator_agent';
import { createResponderAgent } from './responder_agent';
import { createReporterAgent } from './reporter_agent';
import { createMitreAnalystAgent } from './mitre_analyst_agent';

/**
 * Registers all security agent builder agents with the agentBuilder plugin
 */
export const registerAgents = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
) => {
  agentBuilder.agents.register(createThreatHuntingAgent(core, logger));

  // AI SOC agents — gated behind aiSocAgents feature flag
  if (experimentalFeatures.aiSocAgents) {
    agentBuilder.agents.register(createTriageAgent(core, logger));
    agentBuilder.agents.register(createInvestigatorAgent(core, logger));
    agentBuilder.agents.register(createCorrelatorAgent(core, logger));
    agentBuilder.agents.register(createResponderAgent(core, logger));
    agentBuilder.agents.register(createReporterAgent(core, logger));
    agentBuilder.agents.register(createMitreAnalystAgent(core, logger));
  }
};
