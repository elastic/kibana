/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ExperimentalFeatures } from '../../../common/experimental_features';

/**
 * Registers all security workflow steps with the workflowsExtensions plugin.
 */
export const registerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  experimentalFeatures: ExperimentalFeatures
): void => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./render_alert_narrative_step').then((m) => m.renderAlertNarrativeStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./build_alert_entity_graph_step').then((m) => m.buildAlertEntityGraphStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./assign_alert_step/assign_alert_step').then((m) => m.assignAlertStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./set_alert_status_step/set_alert_status_step').then(
      (m) => m.setAlertStatusStepDefinition
    )
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./set_alert_tags_step/set_alert_tags_step').then((m) => m.setAlertTagsStepDefinition)
  );

  if (experimentalFeatures.publicAttacksApiEnabled) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./assign_attack_step/assign_attack_step').then((m) => m.assignAttackStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./set_attack_status_step/set_attack_status_step').then(
        (m) => m.setAttackStatusStepDefinition
      )
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./set_attack_tags_step/set_attack_tags_step').then(
        (m) => m.setAttackTagsStepDefinition
      )
    );
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./enable_rule_step/enable_rule_step').then((m) => m.enableRuleStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./disable_rule_step/disable_rule_step').then((m) => m.disableRuleStepDefinition)
  );
};
