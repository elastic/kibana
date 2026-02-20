/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { IRuleMonitoringService } from '../../lib/detection_engine/rule_monitoring';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';
import { createDeSpaceRulesExecutionTroubleshootingSkill } from './de_space_rules_execution_troubleshooting';

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async (
  agentBuilder: AgentBuilderPluginSetup,
  experimentalFeatures: ExperimentalFeatures,
  options: {
    endpointAppContextService: EndpointAppContextService;
    core: SecuritySolutionPluginCoreSetupDependencies;
    ruleMonitoringService: IRuleMonitoringService;
  }
): Promise<void> => {
  // await agentBuilder.skill.registerSkill(alertAnalysisSampleSkill);
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    await agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }
  if (experimentalFeatures.deRuleExecutionTroubleshootingSkill) {
    await agentBuilder.skills.register(
      createDeSpaceRulesExecutionTroubleshootingSkill({
        core: options.core,
        ruleMonitoringService: options.ruleMonitoringService,
      })
    );
  }
};
