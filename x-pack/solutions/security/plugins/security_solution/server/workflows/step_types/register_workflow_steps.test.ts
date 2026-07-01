/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { setAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { assignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
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

  it('calls registerStepDefinition synchronously for all steps', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(6);
    // getStartServices is called once eagerly to create the shared memoized promise
    expect(core.getStartServices).toHaveBeenCalledTimes(1);
  });

  it('async loader returns step definitions when feature flag is enabled', async () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2, step3, step4, step5, step6] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    await expect((loader1 as StepLoader)()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect((loader2 as StepLoader)()).resolves.toBe(buildAlertEntityGraphStepDefinition);
    expect(step3).toBe(setAlertStatusStepDefinition);
    expect(step4).toBe(setAlertTagsStepDefinition);
    expect(step5).toBe(assignAlertStepDefinition);
    expect(step6).toBe(assignAttackStepDefinition);
  });

  it('async loader returns undefined when feature flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2, step3, step4, step5] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    await expect((loader1 as StepLoader)()).resolves.toBeUndefined();
    await expect((loader2 as StepLoader)()).resolves.toBeUndefined();
    expect(step3).toBe(setAlertStatusStepDefinition);
    expect(step4).toBe(setAlertTagsStepDefinition);
    expect(step5).toBe(assignAlertStepDefinition);
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2] = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );
    await Promise.all([loader1(), loader2()]);

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
