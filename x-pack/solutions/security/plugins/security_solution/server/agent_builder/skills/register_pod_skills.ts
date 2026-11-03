/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { alertAnalysisSkill } from './alert_analysis';
import { alertTriageSkill } from './alert_triage';
import { createInvestigateRuleSkill } from './investigate_rule';
import { pciComplianceSkill } from './pci_compliance';
import { threatHuntingSkill } from './threat_hunting';

/**
 * The security skills whose own code (inline tools) runs wherever a task runtime provides
 * Elasticsearch: Kibana (`registerSkills`) and task pods (`server/tasks`). Registry tools a skill
 * names that a runtime does not register are left out of the skill's tool set.
 */
export const registerPodSkills = async ({
  agentBuilder,
  experimentalFeatures,
}: {
  agentBuilder: Pick<AgentBuilderPluginSetup, 'skills'>;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<void> => {
  await agentBuilder.skills.register(threatHuntingSkill);
  await agentBuilder.skills.register(alertAnalysisSkill);
  await agentBuilder.skills.register(alertTriageSkill);

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    agentBuilder.skills.register(pciComplianceSkill);
  }

  if (experimentalFeatures.investigateRuleSkill) {
    await agentBuilder.skills.register(createInvestigateRuleSkill());
  }
};
