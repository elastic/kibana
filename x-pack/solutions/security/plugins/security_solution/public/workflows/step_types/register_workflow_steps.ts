/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { getAlertTimelineStringStepDefinition } from './get_alert_timeline_string_step';
import { getRelatedAlertsStepDefinition } from './get_related_alerts_step';

/**
 * Registers all security workflow steps with the workflowsExtensions plugin
 */
export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(getAlertTimelineStringStepDefinition);
  workflowsExtensions.registerStepDefinition(getRelatedAlertsStepDefinition);
};
