/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { CoreSetup } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { getSetAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { getSetAttackStatusStepDefinition } from './set_attack_status_step/set_attack_status_step';
import { getAssignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { getAssignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import { getSetAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { getSetAttackTagsStepDefinition } from './set_attack_tags_step/set_attack_tags_step';
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

/**
 * Registers all security workflow steps with the workflowsExtensions plugin.
 * Registration is synchronous; each step uses an async loader to perform the
 * feature-flag check at resolution time.
 */
export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  core: CoreSetup,
  ruleDataClient: IRuleDataClient | null
): void => {
  const isEnabled = core
    .getStartServices()
    .then(([coreStart]) =>
      coreStart.featureFlags.getBooleanValue(
        REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
        REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT
      )
    );

  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await isEnabled)) return undefined;
    return renderAlertNarrativeStepDefinition;
  });

  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await isEnabled)) return undefined;
    return buildAlertEntityGraphStepDefinition;
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getSetAlertStatusStepDefinition(core, ruleDataClient);
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getSetAttackStatusStepDefinition(core, ruleDataClient);
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getAssignAlertStepDefinition(core, ruleDataClient);
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getAssignAttackStepDefinition(core, ruleDataClient);
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getSetAlertTagsStepDefinition(core, ruleDataClient);
  });

  workflowsExtensions.registerStepDefinition(async () => {
    return getSetAttackTagsStepDefinition(core, ruleDataClient);
  });
};
