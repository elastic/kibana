/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { getAlertHistoryStepDefinition } from './get_alert_history_step';
import { getCloseHistoryStepDefinition } from './get_close_history_step';
import { getGlobalPrevalenceStepDefinition } from './get_global_prevalence_step';
import { getRelatedAlertsStepDefinition } from './get_related_alerts_step';
import { getRuleFireCountStepDefinition } from './get_rule_fire_count_step';
import { getRuleMetadataStepDefinition } from './get_rule_metadata_step';
import { toonEncodeStepDefinition } from './toon_encode_step';

/**
 * Registers all security workflow steps with the workflowsExtensions plugin
 */
export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(getAlertHistoryStepDefinition);
  workflowsExtensions.registerStepDefinition(getCloseHistoryStepDefinition);
  workflowsExtensions.registerStepDefinition(getGlobalPrevalenceStepDefinition);
  workflowsExtensions.registerStepDefinition(getRelatedAlertsStepDefinition);
  workflowsExtensions.registerStepDefinition(getRuleFireCountStepDefinition);
  workflowsExtensions.registerStepDefinition(getRuleMetadataStepDefinition);
  workflowsExtensions.registerStepDefinition(toonEncodeStepDefinition);
};


