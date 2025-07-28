/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ProductFeatureKeys,
  ProductFeatureKeyType,
  ProductFeatureKibanaConfig,
} from './types';

/**
 * Creates the ProductFeaturesConfig Map from the given productFeatures object and a set of enabled productFeatures keys.
 *
 * @param productFeatureKeys - The specific ProductFeatureKey enum e.g. ProductFeatureSecurityKey
 * @param productFeaturesConfigs - The product features configs object, no need to include all keys, only the ones that have a config
 * @param enabledProductFeaturesKeys - The enabled product features keys
 * @returns A Map of all the enabled product features configs
 */
export const createEnabledProductFeaturesConfigMap = <
  K extends ProductFeatureKeyType,
  T extends string = string
>(
  productFeatureKeys: Record<string, K>,
  productFeaturesConfigs: Partial<Record<K, ProductFeatureKibanaConfig<T>>>,
  enabledProductFeaturesKeys: ProductFeatureKeys
) => {
  const allProductFeatureKeys = Object.values(productFeatureKeys) as K[];
  return new Map(
    allProductFeatureKeys.reduce<Array<[K, ProductFeatureKibanaConfig<T>]>>((acc, key) => {
      if (enabledProductFeaturesKeys.includes(key)) {
        acc.push([key, productFeaturesConfigs[key] ?? {}]);
      }
      return acc;
    }, [])
  );
};
