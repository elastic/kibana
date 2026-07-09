/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { setAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { setAttackTagsStepDefinition } from './set_attack_tags_step/set_attack_tags_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { assignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import { setAttackStatusStepDefinition } from './set_attack_status_step/set_attack_status_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';
/**
 * Registers all security workflow steps with the workflowsExtensions plugin.
 */
export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  experimentalFeatures: ExperimentalFeatures
): void => {
  workflowsExtensions.registerStepDefinition(renderAlertNarrativeStepDefinition);
  workflowsExtensions.registerStepDefinition(buildAlertEntityGraphStepDefinition);
  workflowsExtensions.registerStepDefinition(setAlertStatusStepDefinition);
  workflowsExtensions.registerStepDefinition(setAlertTagsStepDefinition);
  workflowsExtensions.registerStepDefinition(assignAlertStepDefinition);

  if (experimentalFeatures.publicAttacksApiEnabled) {
    workflowsExtensions.registerStepDefinition(assignAttackStepDefinition);
    workflowsExtensions.registerStepDefinition(setAttackStatusStepDefinition);
    workflowsExtensions.registerStepDefinition(setAttackTagsStepDefinition);
  }

  workflowsExtensions.registerStepDefinition(enableRuleStepDefinition);
  workflowsExtensions.registerStepDefinition(disableRuleStepDefinition);
};
