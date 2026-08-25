/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeyType } from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';
import { featureConfigMerger, extendProductFeatureConfigs } from './product_feature_config';

const feature1 = 'feature1' as ProductFeatureKeyType;
const feature2 = 'feature2' as ProductFeatureKeyType;

describe('product_feature_config', () => {
  describe('featureConfigMerger', () => {
    it('merges arrays with unique values', () => {
      const array1 = [1, 2, 3];
      const array2 = [3, 4, 5];

      const result = featureConfigMerger(array1, array2);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns undefined for non-array values', () => {
      const obj1 = { key: 'value1' };
      const obj2 = { key: 'value2' };

      const result = featureConfigMerger(obj1, obj2);

      expect(result).toBeUndefined();
    });

    it('handles empty arrays', () => {
      const array1: number[] = [];
      const array2 = [1, 2, 3];

      const result = featureConfigMerger(array1, array2);

      expect(result).toEqual([1, 2, 3]);
    });

    it('handles arrays with objects', () => {
      const array1 = [{ id: 1 }, { id: 2 }];
      const array2 = [{ id: 2 }, { id: 3 }];

      const result = featureConfigMerger(array1, array2);

      // Note: Since uniq does shallow comparison, objects with same structure but different references are considered unique
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }]);
    });
  });

  describe('extendProductFeatureConfigs', () => {
    it('merges concatenates arrays', () => {
      const config1: ProductFeaturesConfig = {
        [feature1]: {
          subFeatureIds: ['subFeature1', 'subFeature2'],
          subFeaturesPrivileges: [
            {
              id: 'privilege1',
              ui: ['ui1', 'ui2'],
            },
          ],
        },
      };

      const config2: ProductFeaturesConfig = {
        [feature1]: {
          subFeatureIds: ['subFeature2', 'subFeature3'],
          subFeaturesPrivileges: [
            {
              id: 'privilege2',
              ui: ['ui3'],
            },
          ],
        },
        [feature2]: {
          subFeatureIds: ['subFeature4'],
        },
      };

      const result = extendProductFeatureConfigs(config1, config2);

      expect(result).toEqual({
        [feature1]: {
          subFeatureIds: ['subFeature1', 'subFeature2', 'subFeature3'],
          subFeaturesPrivileges: [
            {
              id: 'privilege1',
              ui: ['ui1', 'ui2'],
            },
            {
              id: 'privilege2',
              ui: ['ui3'],
            },
          ],
        },
        [feature2]: {
          subFeatureIds: ['subFeature4'],
        },
      });
    });

    it('discards duplicates inside arrays', () => {
      const config1: ProductFeaturesConfig = {
        [feature1]: {
          privileges: {
            all: {
              ui: ['ui1', 'ui2'],
            },
          },
        },
      };

      const config2: ProductFeaturesConfig = {
        [feature1]: {
          privileges: {
            all: {
              ui: ['ui2', 'ui3'],
            },
          },
        },
      };

      const result = extendProductFeatureConfigs(config1, config2);

      expect(result).toEqual({
        [feature1]: {
          privileges: {
            all: {
              ui: ['ui1', 'ui2', 'ui3'],
            },
          },
        },
      });
    });

    it('returns empty object when no configs are provided', () => {
      const result = extendProductFeatureConfigs();

      expect(result).toEqual({});
    });

    it('handles nested objects and arrays', () => {
      const config1: ProductFeaturesConfig = {
        [feature1]: {
          app: ['app1'],
          catalogue: ['catalogue1'],
          privileges: {
            all: {
              savedObject: {
                all: ['so1', 'so2'],
                read: ['so1'],
              },
              ui: ['ui1'],
            },
          },
        },
      };

      const config2: ProductFeaturesConfig = {
        [feature1]: {
          app: ['app2'],
          catalogue: ['catalogue1', 'catalogue2'],
          privileges: {
            all: {
              savedObject: {
                all: ['so2', 'so3'],
                read: ['so2'],
              },
              ui: ['ui1', 'ui2'],
            },
          },
        },
      };

      const result = extendProductFeatureConfigs(config1, config2);

      expect(result).toEqual({
        [feature1]: {
          app: ['app1', 'app2'],
          catalogue: ['catalogue1', 'catalogue2'],
          privileges: {
            all: {
              savedObject: {
                all: ['so1', 'so2', 'so3'],
                read: ['so1', 'so2'],
              },
              ui: ['ui1', 'ui2'],
            },
          },
        },
      });
    });

    it('does not mutate original configs', () => {
      const config1 = {
        [feature1]: {
          subFeatureIds: ['subFeature1'],
        },
      };

      const config2 = {
        [feature1]: {
          subFeatureIds: ['subFeature2'],
        },
      };

      const originalConfig1 = { ...config1 };
      const originalConfig2 = { ...config2 };

      extendProductFeatureConfigs(config1, config2);

      expect(config1).toEqual(originalConfig1);
      expect(config2).toEqual(originalConfig2);
    });

    it('handles multiple configs', () => {
      const config1 = {
        [feature1]: {
          subFeatureIds: ['subFeature1'],
        },
      };

      const config2 = {
        [feature1]: {
          subFeatureIds: ['subFeature2'],
        },
      };

      const config3 = {
        [feature1]: {
          subFeatureIds: ['subFeature3'],
        },
        [feature2]: {
          subFeatureIds: ['subFeature4'],
        },
      };

      const result = extendProductFeatureConfigs(config1, config2, config3);

      expect(result).toEqual({
        [feature1]: {
          subFeatureIds: ['subFeature1', 'subFeature2', 'subFeature3'],
        },
        [feature2]: {
          subFeatureIds: ['subFeature4'],
        },
      });
    });
  });
});
