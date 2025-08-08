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

const exampleWithAnonymizedDocumentsAndInsights: Example = {
  ...exampleWithReplacements,
  outputs: {
    ...exampleWithReplacements.outputs,
    anonymizedDocuments: [...exampleWithAlerts.outputs?.anonymizedAlerts],
    insights: [...exampleWithAlerts.outputs?.attackDiscoveries],
  },
};

describe('getGraphInputOverrides', () => {
  describe('root-level outputs overrides', () => {
    it('returns the anonymizedAlerts from the root level of the outputs when present', () => {
      const overrides = getGraphInputOverrides(exampleWithAlerts.outputs);

      expect(overrides.anonymizedDocuments).toEqual(exampleWithAlerts.outputs?.anonymizedAlerts);
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

      expect(overrides.replacements).toBeUndefined();
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

    it('returns the anonymizedDocuments when present', () => {
      const overrides = getGraphInputOverrides(exampleWithAnonymizedDocumentsAndInsights.outputs);

      expect(overrides.anonymizedDocuments).toEqual(
        exampleWithAnonymizedDocumentsAndInsights.outputs?.anonymizedDocuments
      );
    });

    it('returns the insights when present', () => {
      const overrides = getGraphInputOverrides(exampleWithAnonymizedDocumentsAndInsights.outputs);

      expect(overrides.insights).toEqual(
        exampleWithAnonymizedDocumentsAndInsights.outputs?.insights
      );
    });

    it('falls back to anonymizedAlerts when anonymizedDocuments is not present', () => {
      const overrides = getGraphInputOverrides(exampleWithAlerts.outputs);

      expect(overrides.anonymizedDocuments).toEqual(exampleWithAlerts.outputs?.anonymizedAlerts);
    });

    it('falls back to attackDiscoveries when insights is not present', () => {
      const overrides = getGraphInputOverrides(exampleWithAlerts.outputs);

      expect(overrides.insights).toEqual(exampleWithAlerts.outputs?.attackDiscoveries);
    });

    describe('when neither anonymizedDocuments nor insights (or their fallbacks) are present', () => {
      const noDocsOrInsights: Example = {
        id: '5D436078-B2CF-487A-A0FA-7CB46696F54E',
        created_at: '2024-10-10T23:01:19.350232+00:00',
        dataset_id: '0DA3497B-B084-4105-AFC0-2D8E05DE4B7C',
        modified_at: '2024-10-10T23:01:19.350232+00:00',
        inputs: {},
        outputs: {
          replacements: {
            '039c15c5-3964-43e7-a891-42fe2ceeb9ff': 'james',
            '0b53f092-96dd-4282-bfb9-4f75a4530b80': 'root',
            '1123bd7b-3afb-45d1-801a-108f04e7cfb7': 'SRVWIN04',
            '3b9856bc-2c0d-4f1a-b9ae-32742e15ddd1': 'SRVWIN07',
            '5306bcfd-2729-49e3-bdf0-678002778ccf': 'SRVWIN01',
            '55af96a7-69b0-47cf-bf11-29be98a59eb0': 'SRVNIX05',
            '66919fe3-16a4-4dfe-bc90-713f0b33a2ff': 'Administrator',
            '9404361f-53fa-484f-adf8-24508256e70e': 'SRVWIN03',
            'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90': 'SRVMAC08',
            'f59a00e2-f9c4-4069-8390-fd36ecd16918': 'SRVWIN02',
            'fc6d07da-5186-4d59-9b79-9382b0c226b3': 'SRVWIN06',
          },
        },
        runs: [],
      };

      it('does NOT populate anonymizedDocuments when it (or its fallback) is NOT present', () => {
        const overrides = getGraphInputOverrides(noDocsOrInsights.outputs);

        expect(overrides.anonymizedDocuments).toBeUndefined();
      });

      it('does NOT populate insights when it (or its fallback) is NOT present', () => {
        const overrides = getGraphInputOverrides(noDocsOrInsights.outputs);

        expect(overrides.insights).toBeUndefined();
      });
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
            anonymizedDocuments: [],
            combinedGenerations: 'combinedGenerations',
            combinedRefinements: 'combinedRefinements',
            errors: ['error'],
            generationAttempts: 1,
            generations: ['generation'],
            hallucinationFailures: 2,
            insights: [],
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
