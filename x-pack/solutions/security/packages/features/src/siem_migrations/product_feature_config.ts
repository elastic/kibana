/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_API_ACTION_ALL } from '../actions';
import { ProductFeatureSiemMigrationsKey } from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

export const siemMigrationsProductFeaturesConfig: ProductFeaturesConfig<ProductFeatureSiemMigrationsKey> =
  {
    [ProductFeatureSiemMigrationsKey.siemMigrations]: {
      privileges: {
        all: {
          api: [SIEM_MIGRATIONS_API_ACTION_ALL],
          ui: ['all'],
        },
      },
    },
  };
