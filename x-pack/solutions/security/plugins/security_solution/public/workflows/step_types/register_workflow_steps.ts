/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { CoreStart } from '@kbn/core/public';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

/**
 * Registers all security workflow steps with the workflowsExtensions plugin
 */
export const registerWorkflowSteps = async (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  core: CoreStart
): Promise<void> => {
  const registerAlertValidationStepsEnabled = await core.featureFlags.getBooleanValue(
    REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
    REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT
  );

  if (registerAlertValidationStepsEnabled) {
    workflowsExtensions.registerStepDefinition(renderAlertNarrativeStepDefinition);
    workflowsExtensions.registerStepDefinition(buildAlertEntityGraphStepDefinition);
  }
};
