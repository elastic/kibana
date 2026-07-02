/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
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
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

type StepLoader = () => Promise<ServerStepDefinition | undefined>;

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (server)', () => {
  const buildCoreMock = (featureFlagEnabled: boolean) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(featureFlagEnabled);
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    return { core, coreStart };
  };

  it('calls registerStepDefinition synchronously for all steps (attacks disabled)', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: false,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      assignAlertStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertStatusStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertTagsStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(5);
    // getStartServices is called once eagerly to create the shared memoized promise
    expect(core.getStartServices).toHaveBeenCalledTimes(1);
  });

  it('calls registerStepDefinition synchronously for all steps (attacks enabled)', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(8);
  });

  it('async loader returns step definitions when feature flag is enabled', async () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2, step3, step4, step5, step6, step7, step8] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    await expect((loader1 as StepLoader)()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect((loader2 as StepLoader)()).resolves.toBe(buildAlertEntityGraphStepDefinition);
    expect(step3).toBe(assignAlertStepDefinition);
    expect(step4).toBe(setAlertStatusStepDefinition);
    expect(step5).toBe(setAlertTagsStepDefinition);
    expect(step6).toBe(assignAttackStepDefinition);
    expect(step7).toBe(setAttackStatusStepDefinition);
    expect(step8).toBe(setAttackTagsStepDefinition);
  });

  it('async loader returns undefined when feature flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2, step3, step4, step5, step6, step7, step8] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    await expect((loader1 as StepLoader)()).resolves.toBeUndefined();
    await expect((loader2 as StepLoader)()).resolves.toBeUndefined();
    expect(step3).toBe(assignAlertStepDefinition);
    expect(step4).toBe(setAlertStatusStepDefinition);
    expect(step5).toBe(setAlertTagsStepDefinition);
    expect(step6).toBe(assignAttackStepDefinition);
    expect(step7).toBe(setAttackStatusStepDefinition);
    expect(step8).toBe(setAttackTagsStepDefinition);
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {} as ExperimentalFeatures);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls
      .map(([arg]) => arg)
      .filter((arg) => typeof arg === 'function') as StepLoader[];

    await Promise.all([loaders[0](), loaders[1]()]);

    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledTimes(1);
    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
      REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT
    );
  });

  it('does not register assignAttackStepDefinition when publicAttacksApiEnabled is false', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: false,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(5);
    const registeredSteps = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg
    );
    expect(registeredSteps).not.toContain(assignAttackStepDefinition);
  });
});
