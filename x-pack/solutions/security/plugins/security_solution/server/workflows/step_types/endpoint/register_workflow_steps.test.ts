/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { registerEndpointWorkflowSteps } from './register_workflow_steps';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';

const sharedIds = ['security.searchIntegrationKnowledge'];
const atIds = [
  'security.findEndpointArtifacts',
  'security.resolveEndpointHosts',
  'security.getEndpointHostDiagnostics',
  'security.getEndpointPackageStatus',
  'security.getEndpointInventoryCounts',
  'security.finalizeTroubleshootingDiagnosis',
];
const pmIds = [
  'security.getEndpointPolicyFieldReference',
  'security.listEndpointPolicies',
  'security.getEndpointPolicy',
  'security.getEndpointPolicyBaseline',
  'security.compareEndpointPolicies',
  'security.getEndpointPolicyRolloutStatus',
  'security.assessEndpointPolicyChange',
  'security.applyEndpointPolicyChange',
];

describe('registerEndpointWorkflowSteps (server)', () => {
  it.each([
    { at: false, pm: false, expected: [] },
    { at: true, pm: false, expected: [...sharedIds, ...atIds] },
    { at: false, pm: true, expected: [...sharedIds, ...pmIds] },
    { at: true, pm: true, expected: [...sharedIds, ...pmIds, ...atIds] },
  ])('registers consumer groups once with AT=$at PM=$pm', async ({ at, pm, expected }) => {
    const extensions = workflowsExtensionsMock.createSetup();
    registerEndpointWorkflowSteps(extensions, {
      experimentalFeatures: {
        automaticTroubleshootingUniversalSkill: at,
        elasticDefendPolicyManagementUniversalSkill: pm,
      },
      analytics: { reportEvent: jest.fn() },
      getInternalEsClient: jest.fn(),
      endpointAppContextService: createMockEndpointAppContextService(),
    });
    const ids = extensions.registerStepDefinition.mock.calls.map(([definition]) => {
      if (typeof definition === 'function') throw new Error('expected server definition');
      return definition.id;
    });
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
