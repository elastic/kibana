/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityOnboardingFlow } from './observability_onboarding_status';

describe('observability onboarding flow saved object', () => {
  it('is hidden from generic saved object HTTP APIs', () => {
    expect(observabilityOnboardingFlow.hidden).toBe(true);
  });

  it('maps createdBy as a keyword', () => {
    expect(observabilityOnboardingFlow.mappings.properties).toMatchObject({
      createdBy: { type: 'keyword' },
    });
  });

  it('adds createdBy in model version 3', () => {
    const { modelVersions } = observabilityOnboardingFlow;
    if (!modelVersions || typeof modelVersions === 'function') {
      throw new Error('Expected modelVersions to be an object map');
    }

    expect(modelVersions['3']).toMatchObject({
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            createdBy: { type: 'keyword' },
          },
        },
      ],
    });
    expect(modelVersions['3']?.schemas).toEqual(
      expect.objectContaining({
        create: expect.any(Object),
        forwardCompatibility: expect.any(Object),
      })
    );
  });
});
