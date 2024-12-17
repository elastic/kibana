/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import type { SecurityProductTypes } from '../config';
import { ProductTier } from '../product';
import { PLI_PRODUCT_FEATURES } from './pli_config';

/**
 * Returns the U (union) of all PLIs from the enabled productTypes in a single array.
 */
export const getProductProductFeatures = (
  productTypes: SecurityProductTypes
): ProductFeatureKeys => {
  const productFeatureKeys = productTypes.reduce<ProductFeatureKeys>(
    (productFeatures, { product_line: line, product_tier: tier }) => {
      if (tier === ProductTier.complete) {
        productFeatures.push(...PLI_PRODUCT_FEATURES[line][ProductTier.essentials]);
      }
      productFeatures.push(...PLI_PRODUCT_FEATURES[line][tier]);
      return productFeatures;
    },
    []
  );
  return productFeatureKeys;
};
