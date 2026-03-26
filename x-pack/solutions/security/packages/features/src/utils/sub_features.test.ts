/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import type { SubFeatureReplacement } from '../types';
import { addAllSubFeatureReplacements, addSubFeatureReplacements } from './sub_features';

describe('sub_features', () => {
  describe('addSubFeatureReplacements', () => {
    const mockSubFeature: SubFeatureConfig = {
      name: 'Test SubFeature',
      privilegeGroups: [
        {
          groupType: 'mutually_exclusive',
          privileges: [
            {
              id: 'privilege1',
              name: 'Test Privilege 1',
              includeIn: 'read',
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
            {
              id: 'privilege2',
              name: 'Test Privilege 2',
              includeIn: 'all',
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          ],
        },
      ],
    };

    it('returns the original subFeature if no replacements are provided', () => {
      const result = addSubFeatureReplacements(mockSubFeature, []);
      expect(result).toBe(mockSubFeature);
    });

    it('adds replacements to all privileges within the subFeature', () => {
      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'replacementFeature',
          removeOriginalPrivileges: false,
        },
      ];

      const result = addSubFeatureReplacements(mockSubFeature, replacements);

      // Should not mutate original
      expect(mockSubFeature.privilegeGroups[0].privileges[0].replacedBy).toBeUndefined();

      // Should add replacedBy to all privileges
      expect(result.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['privilege1'] },
      ]);
      expect(result.privilegeGroups[0].privileges[1].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['privilege2'] },
      ]);
    });

    it('does not copy privilege IDs when removeOriginalPrivileges is true', () => {
      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'replacementFeature',
          removeOriginalPrivileges: true,
        },
      ];

      const result = addSubFeatureReplacements(mockSubFeature, replacements);

      // Should add empty privileges array for each privilege
      expect(result.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: [] },
      ]);
    });

    it('adds additional privileges when provided', () => {
      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'replacementFeature',
          removeOriginalPrivileges: false,
          additionalPrivileges: {
            privilege1: ['extraPriv1', 'extraPriv2'],
            privilege2: ['extraPriv3'],
          },
        },
      ];

      const result = addSubFeatureReplacements(mockSubFeature, replacements);

      // Should add additional privileges
      expect(result.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['privilege1', 'extraPriv1', 'extraPriv2'] },
      ]);
      expect(result.privilegeGroups[0].privileges[1].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['privilege2', 'extraPriv3'] },
      ]);
    });

    it('appends to existing replacedBy array if present', () => {
      const subFeatureWithExistingReplacements: SubFeatureConfig = {
        ...mockSubFeature,
        privilegeGroups: [
          {
            ...mockSubFeature.privilegeGroups[0],
            privileges: [
              {
                ...mockSubFeature.privilegeGroups[0].privileges[0],
                replacedBy: [{ feature: 'existingFeature', privileges: ['existingPrivilege'] }],
              },
              ...mockSubFeature.privilegeGroups[0].privileges.slice(1),
            ],
          },
        ],
      };

      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'newFeature',
          removeOriginalPrivileges: false,
        },
      ];

      const result = addSubFeatureReplacements(subFeatureWithExistingReplacements, replacements);

      // Should preserve existing replacements and add new ones
      expect(result.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'existingFeature', privileges: ['existingPrivilege'] },
        { feature: 'newFeature', privileges: ['privilege1'] },
      ]);
    });

    it('handles multiple replacements', () => {
      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'feature1',
          removeOriginalPrivileges: false,
        },
        {
          feature: 'feature2',
          removeOriginalPrivileges: true,
          additionalPrivileges: {
            privilege1: ['extra1'],
          },
        },
      ];

      const result = addSubFeatureReplacements(mockSubFeature, replacements);

      // Should add both replacements
      expect(result.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'feature1', privileges: ['privilege1'] },
        { feature: 'feature2', privileges: ['extra1'] },
      ]);
    });
  });

  describe('addAllSubFeatureReplacements', () => {
    const mockSubFeature1: SubFeatureConfig = {
      name: 'SubFeature1',
      privilegeGroups: [
        {
          groupType: 'mutually_exclusive',
          privileges: [
            {
              id: 'priv1',
              name: 'Privilege 1',
              includeIn: 'read',
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          ],
        },
      ],
    };

    const mockSubFeature2: SubFeatureConfig = {
      name: 'SubFeature2',
      privilegeGroups: [
        {
          groupType: 'mutually_exclusive',
          privileges: [
            {
              id: 'priv2',
              name: 'Privilege 2',
              includeIn: 'all',
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          ],
        },
      ],
    };

    it('returns the original map if no replacements are provided', () => {
      const subFeaturesMap = new Map<string, SubFeatureConfig>([
        ['feature1', mockSubFeature1],
        ['feature2', mockSubFeature2],
      ]);

      const result = addAllSubFeatureReplacements(subFeaturesMap, []);

      expect(result).toBe(subFeaturesMap);
    });

    it('adds replacements to all subFeatures in the map', () => {
      const subFeaturesMap = new Map<string, SubFeatureConfig>([
        ['feature1', mockSubFeature1],
        ['feature2', mockSubFeature2],
      ]);

      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'replacementFeature',
          removeOriginalPrivileges: false,
        },
      ];

      const result = addAllSubFeatureReplacements(subFeaturesMap, replacements);

      // Should not mutate original
      expect(
        subFeaturesMap.get('feature1')!.privilegeGroups[0].privileges[0].replacedBy
      ).toBeUndefined();
      expect(
        subFeaturesMap.get('feature2')!.privilegeGroups[0].privileges[0].replacedBy
      ).toBeUndefined();

      // Should add replacements to all features
      expect(result.get('feature1')!.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['priv1'] },
      ]);
      expect(result.get('feature2')!.privilegeGroups[0].privileges[0].replacedBy).toEqual([
        { feature: 'replacementFeature', privileges: ['priv2'] },
      ]);
    });

    it('returns a new map instance and does not mutate the original', () => {
      const subFeaturesMap = new Map<string, SubFeatureConfig>([
        ['feature1', mockSubFeature1],
        ['feature2', mockSubFeature2],
      ]);

      const replacements: SubFeatureReplacement[] = [
        {
          feature: 'replacementFeature',
          removeOriginalPrivileges: false,
        },
      ];

      const result = addAllSubFeatureReplacements(subFeaturesMap, replacements);

      // Should return a new map instance
      expect(result).not.toBe(subFeaturesMap);

      // Original map should remain unchanged
      expect(subFeaturesMap.get('feature1')).toBe(mockSubFeature1);
      expect(subFeaturesMap.get('feature2')).toBe(mockSubFeature2);
    });
  });
});
