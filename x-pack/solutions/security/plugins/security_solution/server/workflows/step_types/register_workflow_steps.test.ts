/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type {
  WorkflowsExtensionsServerPluginSetup,
  ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import {
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from '../../../common/constants';

type StepLoader = () => Promise<ServerStepDefinition | undefined>;

const createWorkflowsExtensionsMock = (): jest.Mocked<WorkflowsExtensionsServerPluginSetup> => ({
  registerStepDefinition: jest.fn(),
  registerTriggerDefinition: jest.fn(),
  registerTriggerEventHandler: jest.fn(),
});

describe('registerWorkflowSteps (server)', () => {
  const buildCoreMock = (featureFlagEnabled: boolean) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(featureFlagEnabled);
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    return { core, coreStart };
  };

  it('calls registerStepDefinition synchronously for both steps', () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(2);
    // getStartServices is called once eagerly to create the shared memoized promise
    expect(core.getStartServices).toHaveBeenCalledTimes(1);
  });

  it('async loader returns step definitions when feature flag is enabled', async () => {
    const { core } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const [loader1, loader2] = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );

    await expect(loader1()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect(loader2()).resolves.toBe(buildAlertEntityGraphStepDefinition);
  });

  it('async loader returns undefined when feature flag is disabled', async () => {
    const { core } = buildCoreMock(false);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

    const [loader1, loader2] = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );

    await expect(loader1()).resolves.toBeUndefined();
    await expect(loader2()).resolves.toBeUndefined();
  });

  it('checks the feature flag exactly once even when both loaders resolve', async () => {
    const { core, coreStart } = buildCoreMock(true);
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, core);

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
});
