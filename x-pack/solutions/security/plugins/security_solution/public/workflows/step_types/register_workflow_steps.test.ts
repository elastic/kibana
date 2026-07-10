/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { setAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { assignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import { setAttackStatusStepDefinition } from './set_attack_status_step/set_attack_status_step';
import { setAttackTagsStepDefinition } from './set_attack_tags_step/set_attack_tags_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (public)', () => {
  it('calls registerStepDefinition synchronously for all steps', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(10);
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(expect.any(Function));
  });

  it('calls registerStepDefinition 5 times when publicAttacksApiEnabled is false', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: false,
    } as unknown as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(7);
  });

  it('async loaders resolve to each step definition', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [
      loader1,
      loader2,
      loader3,
      loader4,
      loader5,
      loader6,
      loader7,
      loader8,
      loader9,
      loader10,
    ] = workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg as StepLoader);

    await expect(loader1()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect(loader2()).resolves.toBe(buildAlertEntityGraphStepDefinition);
    await expect(loader3()).resolves.toBe(assignAlertStepDefinition);
    await expect(loader4()).resolves.toBe(setAlertStatusStepDefinition);
    await expect(loader5()).resolves.toBe(setAlertTagsStepDefinition);
    await expect(loader6()).resolves.toBe(assignAttackStepDefinition);
    await expect(loader7()).resolves.toBe(setAttackStatusStepDefinition);
    await expect(loader8()).resolves.toBe(setAttackTagsStepDefinition);
    await expect(loader9()).resolves.toBe(enableRuleStepDefinition);
    await expect(loader10()).resolves.toBe(disableRuleStepDefinition);
  });

  it('does not register the attack steps when publicAttacksApiEnabled is false', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      publicAttacksApiEnabled: false,
    } as ExperimentalFeatures);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );
    const results = await Promise.all(loaders.map((loader) => loader()));

    expect(results).not.toContain(assignAttackStepDefinition);
    expect(results).not.toContain(setAttackStatusStepDefinition);
    expect(results).not.toContain(setAttackTagsStepDefinition);
  });
});
