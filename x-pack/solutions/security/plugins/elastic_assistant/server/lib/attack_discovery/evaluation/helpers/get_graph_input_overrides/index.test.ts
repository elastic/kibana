/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import type { Example } from 'langsmith/schemas';

import { getGraphInputOverrides } from '.';
import { exampleWithReplacements } from '../../__mocks__/mock_examples';

const exampleWithAlerts: Example = {
  ...exampleWithReplacements,
  outputs: {
    ...exampleWithReplacements.outputs,
    anonymizedAlerts: [
      {
        metadata: {},
        pageContent:
          '@timestamp,2024-10-10T21:01:24.148Z\n' +
          '_id,e809ffc5e0c2e731c1f146e0f74250078136a87574534bf8e9ee55445894f7fc\n' +
          'host.name,e1cb3cf0-30f3-4f99-a9c8-518b955c6f90\n' +
          'user.name,039c15c5-3964-43e7-a891-42fe2ceeb9ff',
      },
      {
        metadata: {},
        pageContent:
          '@timestamp,2024-10-10T21:01:24.148Z\n' +
          '_id,c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b\n' +
          'host.name,e1cb3cf0-30f3-4f99-a9c8-518b955c6f90\n' +
          'user.name,039c15c5-3964-43e7-a891-42fe2ceeb9ff',
      },
    ],
  },
};

const exampleWithNoReplacements: Example = {
  ...exampleWithReplacements,
  outputs: {
    ...omit('replacements', exampleWithReplacements.outputs),
  },
};

describe('getGraphInputOverrides', () => {
  describe('root-level outputs overrides', () => {
    it('returns the anonymizedAlerts from the root level of the outputs when present', () => {
      const overrides = getGraphInputOverrides(exampleWithAlerts.outputs);

      expect(overrides.anonymizedAlerts).toEqual(exampleWithAlerts.outputs?.anonymizedAlerts);
    });

    it('does NOT populate the anonymizedAlerts key when it does NOT exist in the outputs', () => {
      const overrides = getGraphInputOverrides(exampleWithReplacements.outputs);

      expect(overrides).not.toHaveProperty('anonymizedAlerts');
    });

    it('returns replacements from the root level of the outputs when present', () => {
      const overrides = getGraphInputOverrides(exampleWithReplacements.outputs);

      expect(overrides.replacements).toEqual(exampleWithReplacements.outputs?.replacements);
    });

    it('does NOT populate the replacements key when it does NOT exist in the outputs', () => {
      const overrides = getGraphInputOverrides(exampleWithNoReplacements.outputs);

      expect(overrides).not.toHaveProperty('replacements');
    });

    it('removes unknown properties', () => {
      const withUnknownProperties = {
        ...exampleWithReplacements,
        outputs: {
          ...exampleWithReplacements.outputs,
          unknownProperty: 'unknown',
        },
      };

      const overrides = getGraphInputOverrides(withUnknownProperties.outputs);

      expect(overrides).not.toHaveProperty('unknownProperty');
    });
  });

  describe('overrides', () => {
    it('returns all overrides at the root level', () => {
      const exampleWithOverrides = {
        ...exampleWithAlerts,
        outputs: {
          ...exampleWithAlerts.outputs,
          overrides: {
            attackDiscoveries: [],
            attackDiscoveryPrompt: 'prompt',
            anonymizedAlerts: [],
            combinedGenerations: 'combinedGenerations',
            combinedRefinements: 'combinedRefinements',
            errors: ['error'],
            generationAttempts: 1,
            generations: ['generation'],
            hallucinationFailures: 2,
            maxGenerationAttempts: 3,
            maxHallucinationFailures: 4,
            maxRepeatedGenerations: 5,
            refinements: ['refinement'],
            refinePrompt: 'refinePrompt',
            replacements: {},
            unrefinedResults: [],
          },
        },
      };

      const overrides = getGraphInputOverrides(exampleWithOverrides.outputs);

      expect(overrides).toEqual({
        ...exampleWithOverrides.outputs?.overrides,
      });
    });
  });
});
