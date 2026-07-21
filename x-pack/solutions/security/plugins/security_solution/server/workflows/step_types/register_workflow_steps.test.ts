/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { registerWorkflowSteps } from './register_workflow_steps';
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

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (server)', () => {
  it('registers all steps when publicAttacksApiEnabled is true', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(10);
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      renderAlertNarrativeStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      buildAlertEntityGraphStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertStatusStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertTagsStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      assignAlertStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      assignAttackStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAttackStatusStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAttackTagsStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      enableRuleStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      disableRuleStepDefinition
    );
  });

  it('does not register the attack steps when publicAttacksApiEnabled is false', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: false,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(7);
    const registeredSteps = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg
    );
    expect(registeredSteps).not.toContain(assignAttackStepDefinition);
    expect(registeredSteps).not.toContain(setAttackStatusStepDefinition);
    expect(registeredSteps).not.toContain(setAttackTagsStepDefinition);
  });
});
