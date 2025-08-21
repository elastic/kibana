/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureRulesFeatureKey } from '../product_features_keys';
import type { ProductFeatureKibanaConfig } from '../types';

export const rulesDefaultProductFeaturesConfig: Record<
  ProductFeatureRulesFeatureKey,
  ProductFeatureKibanaConfig
> = {
  [ProductFeatureRulesFeatureKey.rules]: {
    privileges: {
      all: {
        api: ['rules_read', 'rules_write'],
        ui: ['read', 'crud'],
      },
      read: {
        api: ['rules_read'],
        ui: ['read'],
      },
    },
  },
};
