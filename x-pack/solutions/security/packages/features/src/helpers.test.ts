/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createEnabledProductFeaturesConfigMap } from './helpers';
import { ProductFeatureSecurityKey } from './product_features_keys';
import type { ProductFeatureKibanaConfig, ProductFeatureKeys } from './types';

const productFeaturesConfigs: Partial<
  Record<ProductFeatureSecurityKey, ProductFeatureKibanaConfig>
> = {
  [ProductFeatureSecurityKey.advancedInsights]: {
    privileges: { all: { ui: ['capability1'] } },
  },
  [ProductFeatureSecurityKey.automaticImport]: {
    privileges: { all: { ui: ['capability2'] } },
  },
  [ProductFeatureSecurityKey.detections]: {
    privileges: { all: { ui: ['capability3'] } },
  },
};

describe('createEnabledProductFeaturesConfigMap', () => {
  it('should return a Map with only enabled product features and their configs', () => {
    const enabledProductFeaturesKeys = [
      ProductFeatureSecurityKey.advancedInsights,
      ProductFeatureSecurityKey.automaticImport,
    ] as unknown as ProductFeatureKeys;

    const result = createEnabledProductFeaturesConfigMap(
      ProductFeatureSecurityKey,
      productFeaturesConfigs,
      enabledProductFeaturesKeys
    );

    expect(result.size).toBe(2);
    expect(result.get(ProductFeatureSecurityKey.advancedInsights)).toEqual({
      privileges: { all: { ui: ['capability1'] } },
    });
    expect(result.get(ProductFeatureSecurityKey.automaticImport)).toEqual({
      privileges: { all: { ui: ['capability2'] } },
    });
    expect(result.has(ProductFeatureSecurityKey.detections)).toBe(false);
  });

  it('should return empty config object if config is missing for enabled key', () => {
    const enabledKeys: ProductFeatureKeys = [
      ProductFeatureSecurityKey.detections,
    ] as unknown as ProductFeatureKeys;

    const result = createEnabledProductFeaturesConfigMap(
      ProductFeatureSecurityKey,
      {}, // No specific configs provided for "detections" ProductFeatureKey
      enabledKeys
    );

    expect(result.size).toBe(1);
    expect(result.get(ProductFeatureSecurityKey.detections)).toEqual({});
  });

  it('should return an empty Map if no features are enabled', () => {
    const result = createEnabledProductFeaturesConfigMap(
      ProductFeatureSecurityKey,
      productFeaturesConfigs,
      []
    );

    expect(result.size).toBe(0);
  });
});
