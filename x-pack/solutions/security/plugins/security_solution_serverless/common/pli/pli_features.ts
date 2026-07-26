/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys, ProductFeatureKeyType } from '@kbn/security-solution-features';
import type { SecurityProductTypes } from '../config';
import { PLI_PRODUCT_FEATURES } from './pli_config';
import { ProductLine, ProductTier } from '../product';

/**
 * Returns the U (union) of all PLIs from the enabled productTypes in a single array.
 */
export const getEnabledProductFeatures = (
  productTypes: SecurityProductTypes
): ProductFeatureKeys => {
  return productTypes.reduce<ProductFeatureKeys>(
    (productFeatures, { product_line: line, product_tier: tier }) => {
      productFeatures.push(...PLI_PRODUCT_FEATURES[line][tier]);
      return productFeatures;
    },
    []
  );
};

/**
 * Returns the required product types names for a given feature.
 * Possible product names:
 * - Security: Essentials
 * - Security: Complete
 * - Security: Elastic AI SOC Engine
 * - Security: Endpoint Protection Essentials
 * - Security: Endpoint Protection Complete
 * - Security: Cloud Protection Essentials
 * - Security: Cloud Protection Complete
 */
export const getRequiredProductTypesForFeature = (feature: ProductFeatureKeyType): string[] => {
  return Object.entries(PLI_PRODUCT_FEATURES).reduce<string[]>(
    (requiredProductTypes, [line, tiers]) => {
      for (const [tier, features] of Object.entries(tiers)) {
        if (features.includes(feature)) {
          let productName = 'Security:';
          switch (line) {
            case ProductLine.aiSoc:
              productName += ' Elastic AI SOC Engine';
              break;
            case ProductLine.endpoint:
              productName += ' Endpoint Protection';
              break;
            case ProductLine.cloud:
              productName += ' Cloud Protection';
              break;
          }

          // EASE is special, it does not have product tiers
          if (line !== ProductLine.aiSoc) {
            productName += tier === ProductTier.complete ? ' Complete' : ' Essentials';
          }
          requiredProductTypes.push(productName);
        }
      }
      return requiredProductTypes;
    },
    []
  );
};
