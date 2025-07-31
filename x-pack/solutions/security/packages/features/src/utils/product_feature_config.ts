/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith, uniq } from 'lodash';
import type { ProductFeatureKeyType, ProductFeaturesConfig } from '../types';

/**
 * Custom merge function for product feature configs. To be used with `mergeWith`.
 * It merges arrays by removing duplicates by shallow comparison and extends other properties.
 * It does not mutate the original objects.
 * @param objValue - The value from the first object
 * @param srcValue - The value from the second object
 * @returns The merged value
 */
export const featureConfigMerger = (objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return uniq(objValue.concat(srcValue));
  }
  return undefined; // Use default merge behavior for other types
};

/**
 * Extends multiple ProductFeaturesConfig objects into a single one.
 * It merges arrays by removing duplicates and keeps the rest of the properties as is.
 * It does not mutate the original objects.
 *
 * @param productFeatureConfigs - The product feature configs to merge
 * @returns A single extended ProductFeaturesConfig object
 */
export const extendProductFeatureConfigs = <
  K extends ProductFeatureKeyType,
  S extends string = string
>(
  ...productFeatureConfigs: Array<ProductFeaturesConfig<K, S>>
): ProductFeaturesConfig<K, S> => {
  return mergeWith({}, ...productFeatureConfigs, featureConfigMerger);
};
