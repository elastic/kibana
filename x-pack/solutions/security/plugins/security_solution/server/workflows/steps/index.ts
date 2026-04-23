/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { alertsSearchStepDefinition } from './alerts_search_step';
import { noisyRuleStepDefinition } from './noisy_rule_step';

export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(alertsSearchStepDefinition);
  workflowsExtensions.registerStepDefinition(noisyRuleStepDefinition);
};
