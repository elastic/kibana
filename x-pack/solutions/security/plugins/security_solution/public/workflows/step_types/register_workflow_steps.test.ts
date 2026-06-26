/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

/**
 * Ordered registration manifest. Index = position in the
 * `registerStepDefinition.mock.calls` array.
 *
 * `featureFlagGated: true` means the loader returns `undefined` when the
 * security alert-validation feature flag is off; ungated loaders always
 * resolve to their definition.
 */
const REGISTRATIONS = [
  { definition: renderAlertNarrativeStepDefinition, featureFlagGated: true },
  { definition: buildAlertEntityGraphStepDefinition, featureFlagGated: true },
  { definition: setAlertStatusStepDefinition, featureFlagGated: false },
  { definition: assignAlertStepDefinition, featureFlagGated: false },
  { definition: enableRuleStepDefinition, featureFlagGated: false },
  { definition: disableRuleStepDefinition, featureFlagGated: false },
];

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (public)', () => {
  const buildCoreMock = (featureFlagEnabled: boolean) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockReturnValue(featureFlagEnabled);
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    return { core, coreStart };
  };

  it('calls registerStepDefinition synchronously for all steps', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(REGISTRATIONS.length);
    // getStartServices is called once eagerly to create the shared memoized promise
    expect(core.getStartServices).toHaveBeenCalledTimes(1);
  });

  it('each loader resolves to its step definition when the feature flag is enabled', async () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );

    for (let i = 0; i < REGISTRATIONS.length; i++) {
      await expect(loaders[i]()).resolves.toBe(REGISTRATIONS[i].definition);
    }
  });

  it('feature-flagged loaders resolve to undefined when the flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );

    for (let i = 0; i < REGISTRATIONS.length; i++) {
      const { definition, featureFlagGated } = REGISTRATIONS[i];
      if (featureFlagGated) {
        await expect(loaders[i]()).resolves.toBeUndefined();
      } else {
        await expect(loaders[i]()).resolves.toBe(definition);
      }
    }
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const gatedLoaders = workflowsExtensions.registerStepDefinition.mock.calls
      .map(([arg]) => arg as StepLoader)
      .filter((_, i) => REGISTRATIONS[i].featureFlagGated);
    await Promise.all(gatedLoaders.map((load) => load()));

    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledTimes(1);
    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
      REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT
    );
  });
});
