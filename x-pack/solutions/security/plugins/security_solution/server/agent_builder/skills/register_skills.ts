/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { alertTriageSkill } from './alert_triage_skill';
import { hostAnalysisSkill } from './host_analysis_skill';
import { threatIntelSkill } from './threat_intel_skill';
import { networkForensicsSkill } from './network_forensics_skill';

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async (agentBuilder: AgentBuilderPluginSetup): Promise<void> => {
  // await agentBuilder.skill.registerSkill(alertAnalysisSampleSkill);
  await agentBuilder.skills.register(alertTriageSkill);
  await agentBuilder.skills.register(hostAnalysisSkill);
  await agentBuilder.skills.register(threatIntelSkill);
  await agentBuilder.skills.register(networkForensicsSkill);
};
