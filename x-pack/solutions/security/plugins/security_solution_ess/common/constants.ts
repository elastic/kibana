/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeyType } from '@kbn/security-solution-features/keys';
import {
  ALL_PRODUCT_FEATURE_KEYS,
  ProductFeatureSecurityKey,
  ProductFeatureRulesKey,
} from '@kbn/security-solution-features/keys';

// List of product features that are disabled in different offering (eg. Serverless).
const DISABLED_PRODUCT_FEATURES: ProductFeatureKeyType[] = [
  ProductFeatureRulesKey.externalDetections,
  ProductFeatureSecurityKey.configurations,
];

export const DEFAULT_PRODUCT_FEATURES = ALL_PRODUCT_FEATURE_KEYS.filter(
  (key) => !DISABLED_PRODUCT_FEATURES.includes(key as ProductFeatureKeyType)
);
