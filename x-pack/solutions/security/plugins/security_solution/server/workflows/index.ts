/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { registerSecurityWorkflowTriggers } from './triggers';
import { registerSecurityWorkflowSteps } from './steps';

/**
 * Registers all Security Solution workflows extensions (triggers + steps).
 *
 * **Triggers:**
 * - security-solution.highRiskAlertIndexed
 *
 * **Steps:**
 * - security-solution.mapAlertToMitre
 *
 * @param workflowsExtensions - Workflows Extensions plugin setup contract
 */
export function registerSecurityWorkflows(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  registerSecurityWorkflowTriggers(workflowsExtensions);
  registerSecurityWorkflowSteps(workflowsExtensions);
}
