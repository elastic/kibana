/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  registerEndpointWorkflowSteps,
  type RegisterEndpointWorkflowStepsDeps,
} from './register_workflow_steps';

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerEndpointWorkflowSteps (server)', () => {
  const createDeps = (
    automaticTroubleshootingUniversalSkill: boolean
  ): RegisterEndpointWorkflowStepsDeps => ({
    experimentalFeatures: {
      automaticTroubleshootingUniversalSkill,
    },
    getInternalEsClient: jest.fn(),
  });

  it('registers no steps when the universal flag is off', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerEndpointWorkflowSteps(workflowsExtensions, createDeps(false));

    expect(workflowsExtensions.registerStepDefinition).not.toHaveBeenCalled();
  });

  it('registers the shared steps when the universal flag is on', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerEndpointWorkflowSteps(workflowsExtensions, createDeps(true));

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(2);
    const registeredIds = workflowsExtensions.registerStepDefinition.mock.calls.map(([stepDef]) => {
      if (typeof stepDef === 'function') {
        throw new Error('expected a step definition');
      }
      return stepDef.id;
    });
    expect(registeredIds).toEqual([
      'security.findEndpointArtifacts',
      'security.searchIntegrationKnowledge',
    ]);
  });
});
