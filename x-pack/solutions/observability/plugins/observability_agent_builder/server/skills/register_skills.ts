/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { serviceInvestigationSkill } from './service_investigation';
import { logAnalysisSkill } from './log_analysis';
import { infrastructureAlertingSkill } from './infrastructure_alerting';

export async function registerSkills(agentBuilder: AgentBuilderPluginSetup): Promise<void> {
  await agentBuilder.skills.register(serviceInvestigationSkill);
  await agentBuilder.skills.register(logAnalysisSkill);
  await agentBuilder.skills.register(infrastructureAlertingSkill);
}
