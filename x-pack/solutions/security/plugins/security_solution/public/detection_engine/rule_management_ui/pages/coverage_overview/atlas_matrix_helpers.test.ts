/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAtlasMatrixFromYaml,
  getParentAtlasTechniqueId,
  isAtlasSubTechnique,
} from './atlas_matrix_helpers';
import { techniqueMatchesSelectedPlatforms } from './atlas_platforms';

describe('atlas_matrix_helpers', () => {
  describe('isAtlasSubTechnique', () => {
    it('returns false for parent techniques', () => {
      expect(isAtlasSubTechnique('AML.T0000')).toBe(false);
    });

    it('returns true for sub-techniques', () => {
      expect(isAtlasSubTechnique('AML.T0000.001')).toBe(true);
    });
  });

  describe('getParentAtlasTechniqueId', () => {
    it('strips the last dotted segment', () => {
      expect(getParentAtlasTechniqueId('AML.T0000.001')).toBe('AML.T0000');
    });
  });

  describe('buildAtlasMatrixFromYaml', () => {
    it('maps techniques to tactics, nests sub-techniques, and keeps platforms', () => {
      const matrix = buildAtlasMatrixFromYaml({
        tactics: {
          'AML.TA0002': { id: 'AML.TA0002', name: 'Reconnaissance' },
          'AML.TA0000': { id: 'AML.TA0000', name: 'AI Model Access' },
        },
        techniques: {
          'AML.T0000': {
            id: 'AML.T0000',
            name: 'Search Open Technical Databases',
            platforms: ['Enterprise'],
          },
          'AML.T0000.001': {
            id: 'AML.T0000.001',
            name: 'Search Open Technical Databases Sub',
            platforms: ['Enterprise', 'Generative AI'],
          },
          'AML.T0040': {
            id: 'AML.T0040',
            name: 'AI Model Inference API Access',
            platforms: ['Predictive AI'],
          },
        },
        relationships: {
          'AML.T0000': {
            achieves: [{ target: 'AML.TA0002' }],
          },
          'AML.T0000.001': {
            achieves: [{ target: 'AML.TA0002' }],
          },
          'AML.T0040': {
            achieves: [{ target: 'AML.TA0000' }],
          },
        },
      });

      expect(matrix).toEqual([
        {
          id: 'AML.TA0000',
          name: 'AI Model Access',
          techniques: [
            {
              id: 'AML.T0040',
              name: 'AI Model Inference API Access',
              platforms: ['Predictive AI'],
              subtechniques: [],
            },
          ],
        },
        {
          id: 'AML.TA0002',
          name: 'Reconnaissance',
          techniques: [
            {
              id: 'AML.T0000',
              name: 'Search Open Technical Databases',
              platforms: ['Enterprise'],
              subtechniques: [
                {
                  id: 'AML.T0000.001',
                  name: 'Search Open Technical Databases Sub',
                  platforms: ['Enterprise', 'Generative AI'],
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});

describe('techniqueMatchesSelectedPlatforms', () => {
  it('returns false when nothing is selected', () => {
    expect(techniqueMatchesSelectedPlatforms(['Enterprise'], [])).toBe(false);
  });

  it('returns true when any platform overlaps', () => {
    expect(
      techniqueMatchesSelectedPlatforms(['Enterprise', 'Generative AI'], ['Generative AI'])
    ).toBe(true);
  });

  it('returns false when there is no overlap', () => {
    expect(techniqueMatchesSelectedPlatforms(['Enterprise'], ['Predictive AI'])).toBe(false);
  });
});
