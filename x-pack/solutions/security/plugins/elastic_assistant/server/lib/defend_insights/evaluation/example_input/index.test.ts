/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExampleDefendInsightsInput, ExampleDefendInsightsInputWithOverrides } from '.';

const mockDefendInsight = {
  group: 'Windows Defender',
  events: [
    {
      id: 'event-1',
      endpointId: 'endpoint-123',
      value: 'some value',
    },
    {
      id: 'event-2',
      endpointId: 'endpoint-456',
      value: 'another value',
    },
  ],
};

const validInput = {
  insights: [mockDefendInsight],
  prompt: 'test prompt',
  anonymizedDocuments: [
    {
      pageContent: 'event content',
      metadata: {
        source: 'alert',
      },
    },
  ],
  combinedGenerations: 'gen1+gen2',
  combinedRefinements: 'ref1+ref2',
  errors: ['error1', 'error2'],
  generationAttempts: 1,
  generations: ['gen1', 'gen2'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 3,
  maxHallucinationFailures: 2,
  maxRepeatedGenerations: 1,
  refinements: ['ref1'],
  refinePrompt: 'refine me',
  replacements: {
    alertA: 'alertB',
  },
  unrefinedResults: [mockDefendInsight],
};

describe('ExampleDefendInsightsInput Schema', () => {
  it('validates a correct ExampleDefendInsightsInput object', () => {
    expect(() => ExampleDefendInsightsInput.parse(validInput)).not.toThrow();
  });

  it('throws given an invalid ExampleDefendInsightsInput', () => {
    const invalidInput = {
      insights: 'should be array or null', // invalid
    };

    expect(() => ExampleDefendInsightsInput.parse(invalidInput)).toThrow();
  });

  it('removes unknown properties', () => {
    const inputWithExtraProps = {
      ...validInput,
      extraField: 'should be stripped',
    };

    const parsed = ExampleDefendInsightsInput.parse(inputWithExtraProps);

    expect(parsed).not.toHaveProperty('extraField');
  });
});

describe('ExampleDefendInsightsInputWithOverrides Schema', () => {
  it('validates a correct ExampleDefendInsightsInputWithOverrides object', () => {
    const validWithOverrides = {
      ...validInput,
      overrides: {
        prompt: 'overridden prompt',
        generationAttempts: 5,
      },
    };

    expect(() => ExampleDefendInsightsInputWithOverrides.parse(validWithOverrides)).not.toThrow();
  });

  it('throws when given an invalid ExampleDefendInsightsInputWithOverrides object', () => {
    const invalid = {
      insights: null,
      overrides: 'not an object',
    };

    expect(() => ExampleDefendInsightsInputWithOverrides.parse(invalid)).toThrow();
  });
});
