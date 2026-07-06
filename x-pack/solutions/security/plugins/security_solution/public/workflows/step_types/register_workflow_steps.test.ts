/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
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
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (public)', () => {
  const buildCoreMock = (featureFlagEnabled: boolean) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockReturnValue(featureFlagEnabled);
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    return { core, coreStart };
  };

  it('calls registerStepDefinition synchronously for all steps (attacks disabled)', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: false,
    } as ExperimentalFeatures);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(expect.any(Function));
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

    const [loader1, loader2, loader3, loader4, loader5, loader6, loader7, loader8] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg as StepLoader);

    await expect(loader1()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect(loader2()).resolves.toBe(buildAlertEntityGraphStepDefinition);
    await expect(loader3()).resolves.toBe(assignAlertStepDefinition);
    await expect(loader4()).resolves.toBe(setAlertStatusStepDefinition);
    await expect(loader5()).resolves.toBe(setAlertTagsStepDefinition);
    await expect(loader6()).resolves.toBe(assignAttackStepDefinition);
    await expect(loader7()).resolves.toBe(setAttackStatusStepDefinition);
    await expect(loader8()).resolves.toBe(setAttackTagsStepDefinition);
  });

  it('async loader returns undefined when feature flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {
      publicAttacksApiEnabled: true,
    } as ExperimentalFeatures);

    const [loader1, loader2, loader3, loader4, loader5, loader6, loader7, loader8] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg as StepLoader);

    await expect(loader1()).resolves.toBeUndefined();
    await expect(loader2()).resolves.toBeUndefined();
    await expect(loader3()).resolves.toBe(assignAlertStepDefinition);
    await expect(loader4()).resolves.toBe(setAlertStatusStepDefinition);
    await expect(loader5()).resolves.toBe(setAlertTagsStepDefinition);
    await expect(loader6()).resolves.toBe(assignAttackStepDefinition);
    await expect(loader7()).resolves.toBe(setAttackStatusStepDefinition);
    await expect(loader8()).resolves.toBe(setAttackTagsStepDefinition);
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core, {} as ExperimentalFeatures);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );
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
  });
});
