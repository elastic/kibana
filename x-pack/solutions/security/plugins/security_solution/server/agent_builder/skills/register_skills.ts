/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';
import { createDetectionRuleCreationSkill } from './detection_rule_creation_skill';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  options: {
    endpointAppContextService: EndpointAppContextService;
  }
): Promise<void> => {
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    await agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }
  agentBuilder.skills.register(createDetectionRuleCreationSkill(core, logger));
};
