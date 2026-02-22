/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { alertAnalysisSampleSkill } from './alert_analysis_skill';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  experimentalFeatures: ExperimentalFeatures,
  options: {
    endpointAppContextService: EndpointAppContextService;
  }
): void => {
  agentBuilder.skills.register(alertAnalysisSampleSkill);
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }
};
