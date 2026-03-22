/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { mapAlertToMitrePublicStepDefinition } from './steps/map_alert_to_mitre';
import { highRiskAlertIndexedPublicDefinition } from './triggers/high_risk_alert_indexed';

/**
 * Registers all Security Solution workflows extensions UI definitions.
 *
 * @param workflowsExtensions - Workflows Extensions plugin setup contract
 */
export function registerSecurityWorkflowsUI(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  // Register trigger UI definition
  workflowsExtensions.registerTriggerDefinition(highRiskAlertIndexedPublicDefinition);

  // Register step UI definition
  workflowsExtensions.registerStepDefinition(mapAlertToMitrePublicStepDefinition);
}
