/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEnabledProductFeatures, getRequiredProductTypesForFeature } from './pli_features';
import * as pliConfig from './pli_config';
import { ProductLine, ProductTier } from '../product';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';

describe('getProductProductFeatures', () => {
  it('returns an empty array if no product types are provided', () => {
    expect(getEnabledProductFeatures([])).toEqual([]);
  });

  it('returns features for a single product type', () => {
    // @ts-ignore- reassigning readonly value for testing
    pliConfig.PLI_PRODUCT_FEATURES = {
      security: {
        search_ai_lake: [],
        essentials: ['foo'],
        complete: ['baz'],
      },
    };

    const productFeatureKeys = getEnabledProductFeatures([
      { product_line: ProductLine.security, product_tier: ProductTier.essentials },
    ]);

    expect(productFeatureKeys).toEqual(['foo']);
  });

  it('returns an empty object if no PLIs are enabled', () => {
    expect(getEnabledProductFeatures([])).toEqual([]);
  });
});

describe('getRequiredProductTypesForFeature', () => {
  beforeEach(() => {
    // @ts-ignore - reassigning readonly value for testing
    pliConfig.PLI_PRODUCT_FEATURES = {
      [ProductLine.security]: {
        search_ai_lake: [],
        essentials: ['featureA'],
        complete: ['featureA', 'featureB'],
      },
      [ProductLine.endpoint]: {
        search_ai_lake: [],
        essentials: [],
        complete: ['featureB'],
      },
      [ProductLine.cloud]: {
        search_ai_lake: [],
        essentials: [],
        complete: [],
      },
      [ProductLine.aiSoc]: {
        search_ai_lake: ['featureC'],
        essentials: [],
        complete: [],
      },
    };
  });

  it('returns an empty array for a feature not present in any product', () => {
    expect(getRequiredProductTypesForFeature('nonExistent' as ProductFeatureKeyType)).toEqual([]);
  });

  it('returns a single product type for a feature in one tier', () => {
    const result = getRequiredProductTypesForFeature('featureC' as ProductFeatureKeyType);
    expect(result).toEqual(['Security: Elastic AI SOC Engine']);
  });

  it('returns multiple product types when a feature appears across lines and tiers', () => {
    const result = getRequiredProductTypesForFeature('featureB' as ProductFeatureKeyType);
    expect(result).toEqual(['Security: Complete', 'Security: Endpoint Protection Complete']);
  });

  it('returns both essentials and complete when a feature appears in both tiers', () => {
    const result = getRequiredProductTypesForFeature('featureA' as ProductFeatureKeyType);
    expect(result).toEqual(['Security: Essentials', 'Security: Complete']);
  });

  it('does not append a tier suffix for the aiSoc product line', () => {
    const result = getRequiredProductTypesForFeature('featureC' as ProductFeatureKeyType);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Security: Elastic AI SOC Engine');
    expect(result[0]).not.toContain('Essentials');
    expect(result[0]).not.toContain('Complete');
  });
});
