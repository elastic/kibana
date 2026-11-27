/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { registerEndpointWorkflowSteps } from './register_workflow_steps';

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

describe('registerEndpointWorkflowSteps (public)', () => {
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
    });
    const definitions = await Promise.all(
      extensions.registerStepDefinition.mock.calls.map(([loader]) =>
        (loader as () => Promise<PublicStepDefinition>)()
      )
    );
    const ids = definitions.map(({ id }) => id);
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
