/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { mapAlertToMitreServerStepDefinition } from './map_alert_to_mitre';

/**
 * Registers Security Solution workflow steps.
 *
 * **Steps:**
 * - security-solution.mapAlertToMitre - Maps alert to MITRE ATT&CK using LLM
 *
 * @param workflowsExtensions - Workflows Extensions plugin setup contract
 */
export function registerSecurityWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  workflowsExtensions.registerStepDefinition(mapAlertToMitreServerStepDefinition);
}
