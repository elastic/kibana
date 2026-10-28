/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import {
  registerEndpointWorkflowSteps,
  type RegisterEndpointWorkflowStepsDeps,
} from './register_workflow_steps';
import {
  findEndpointArtifactsPublicStepDefinition,
  searchIntegrationKnowledgePublicStepDefinition,
} from './steps';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerEndpointWorkflowSteps (public)', () => {
  const createDeps = (
    automaticTroubleshootingUniversalSkill: boolean
  ): RegisterEndpointWorkflowStepsDeps => ({
    experimentalFeatures: {
      automaticTroubleshootingUniversalSkill,
    },
  });

  it('registers no steps when the universal flag is off', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerEndpointWorkflowSteps(workflowsExtensions, createDeps(false));

    expect(workflowsExtensions.registerStepDefinition).not.toHaveBeenCalled();
  });

  it('registers the shared steps with async loaders when the universal flag is on', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerEndpointWorkflowSteps(workflowsExtensions, createDeps(true));

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(2);
    const [loader1, loader2] = workflowsExtensions.registerStepDefinition.mock.calls.map(
      ([arg]) => arg as StepLoader
    );

    await expect(loader1()).resolves.toBe(findEndpointArtifactsPublicStepDefinition);
    await expect(loader2()).resolves.toBe(searchIntegrationKnowledgePublicStepDefinition);
  });
});
