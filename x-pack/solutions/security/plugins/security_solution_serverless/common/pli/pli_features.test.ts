/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEnabledProductFeatures } from './pli_features';
import * as pliConfig from './pli_config';
import { ProductLine, ProductTier } from '../product';

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
