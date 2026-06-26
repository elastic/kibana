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
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

type StepLoader = () => Promise<ServerStepDefinition | undefined>;

/**
 * Ordered registration manifest. Index = position in the
 * `registerStepDefinition.mock.calls` array; `kind` records whether the step
 * is registered as a synchronous definition or as an async (feature-flagged)
 * loader.
 */
const REGISTRATIONS = [
  { definition: renderAlertNarrativeStepDefinition, kind: 'loader' as const },
  { definition: buildAlertEntityGraphStepDefinition, kind: 'loader' as const },
  { definition: setAlertStatusStepDefinition, kind: 'sync' as const },
  { definition: assignAlertStepDefinition, kind: 'sync' as const },
  { definition: enableRuleStepDefinition, kind: 'sync' as const },
  { definition: disableRuleStepDefinition, kind: 'sync' as const },
];

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

    registerWorkflowSteps(workflowsExtensions, core);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(
      REGISTRATIONS.length
    );
    // getStartServices is called once eagerly to create the shared memoized promise
    expect(core.getStartServices).toHaveBeenCalledTimes(1);
  });

  it('registers each step definition (loaders resolve when feature flag enabled)', async () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const args = workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    for (let i = 0; i < REGISTRATIONS.length; i++) {
      const { definition, kind } = REGISTRATIONS[i];
      if (kind === 'loader') {
        await expect((args[i] as StepLoader)()).resolves.toBe(definition);
      } else {
        expect(args[i]).toBe(definition);
      }
    }
  });

  it('feature-flagged loaders resolve to undefined when the flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const args = workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg);

    for (let i = 0; i < REGISTRATIONS.length; i++) {
      const { definition, kind } = REGISTRATIONS[i];
      if (kind === 'loader') {
        await expect((args[i] as StepLoader)()).resolves.toBeUndefined();
      } else {
        expect(args[i]).toBe(definition);
      }
    }
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const loaders = workflowsExtensions.registerStepDefinition.mock.calls
      .map(([arg]) => arg as StepLoader)
      .filter((_, i) => REGISTRATIONS[i].kind === 'loader');
    await Promise.all(loaders.map((load) => load()));

    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledTimes(1);
    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
      REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT
    );
  });
});
