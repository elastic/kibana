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
  finalizeTroubleshootingDiagnosisPublicStepDefinition,
  findEndpointArtifactsPublicStepDefinition,
  getEndpointHostDiagnosticsPublicStepDefinition,
  getEndpointInventoryCountsPublicStepDefinition,
  getEndpointPackageStatusPublicStepDefinition,
  resolveEndpointHostsPublicStepDefinition,
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

  it('registers the shared and defend steps with async loaders when the universal flag is on', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerEndpointWorkflowSteps(workflowsExtensions, createDeps(true));

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(7);
    const [loader1, loader2, loader3, loader4, loader5, loader6, loader7] =
      workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg as StepLoader);

    await expect(loader1()).resolves.toBe(findEndpointArtifactsPublicStepDefinition);
    await expect(loader2()).resolves.toBe(searchIntegrationKnowledgePublicStepDefinition);
    await expect(loader3()).resolves.toBe(resolveEndpointHostsPublicStepDefinition);
    await expect(loader4()).resolves.toBe(getEndpointHostDiagnosticsPublicStepDefinition);
    await expect(loader5()).resolves.toBe(getEndpointPackageStatusPublicStepDefinition);
    await expect(loader6()).resolves.toBe(getEndpointInventoryCountsPublicStepDefinition);
    await expect(loader7()).resolves.toBe(finalizeTroubleshootingDiagnosisPublicStepDefinition);
  });
});
