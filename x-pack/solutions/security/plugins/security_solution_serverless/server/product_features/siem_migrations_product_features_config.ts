/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ProductFeatureKeys,
  SiemMigrationsProductFeaturesConfigMap,
} from '@kbn/security-solution-features';
import {
  siemMigrationsDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';

export const getSiemMigrationsProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): SiemMigrationsProductFeaturesConfigMap =>
    createEnabledProductFeaturesConfigMap(
      siemMigrationsDefaultProductFeaturesConfig,
      enabledProductFeatureKeys
    );
