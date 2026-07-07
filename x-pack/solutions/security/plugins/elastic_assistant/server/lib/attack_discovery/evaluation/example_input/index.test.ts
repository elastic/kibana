/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExampleInput, ExampleInputWithOverrides } from '.';

const validInput = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: 'prompt',
  anonymizedAlerts: [{ pageContent: 'content', metadata: { key: 'value' } }],
  combinedGenerations: 'gen1gen2',
  combinedRefinements: 'ref1ref2',
  errors: ['error1', 'error2'],
  generationAttempts: 1,
  generations: ['gen1', 'gen2'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 5,
  maxHallucinationFailures: 2,
  maxRepeatedGenerations: 3,
  refinements: ['ref1', 'ref2'],
  refinePrompt: 'refine prompt',
  replacements: { key: 'replacement' },
  unrefinedResults: null,
};

describe('ExampleInput Schema', () => {
  it('validates a correct ExampleInput object', () => {
    expect(() => ExampleInput.parse(validInput)).not.toThrow();
  });

  it('throws given an invalid ExampleInput', () => {
    const invalidInput = {
      attackDiscoveries: 'invalid', // should be an array or null
    };

    expect(() => ExampleInput.parse(invalidInput)).toThrow();
  });

  it('removes unknown properties', () => {
    const hasUnknownProperties = {
      ...validInput,
      unknownProperty: 'unknown', // <-- should be removed
    };

    const parsed = ExampleInput.parse(hasUnknownProperties);

    expect(parsed).not.toHaveProperty('unknownProperty');
  });
});

describe('ExampleInputWithOverrides Schema', () => {
  it('validates a correct ExampleInputWithOverrides object', () => {
    const validInputWithOverrides = {
      ...validInput,
      overrides: {
        attackDiscoveryPrompt: 'ad prompt override',
        refinePrompt: 'refine prompt override',
      },
    };

    expect(() => ExampleInputWithOverrides.parse(validInputWithOverrides)).not.toThrow();
  });

  it('throws when given an invalid ExampleInputWithOverrides object', () => {
    const invalidInputWithOverrides = {
      attackDiscoveries: null,
      overrides: 'invalid', // should be an object
    };

    expect(() => ExampleInputWithOverrides.parse(invalidInputWithOverrides)).toThrow();
  });
});
