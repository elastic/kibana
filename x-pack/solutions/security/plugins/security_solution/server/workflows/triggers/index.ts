/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { commonHighRiskAlertIndexedTrigger } from '../../../common/workflows/triggers/high_risk_alert_indexed';

/**
 * Registers Security Solution workflow triggers.
 *
 * **Triggers:**
 * - security-solution.highRiskAlertIndexed - Emitted when alert with risk_score >= 50 indexed
 *
 * @param workflowsExtensions - Workflows Extensions plugin setup contract
 */
export function registerSecurityWorkflowTriggers(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(commonHighRiskAlertIndexedTrigger);
}
