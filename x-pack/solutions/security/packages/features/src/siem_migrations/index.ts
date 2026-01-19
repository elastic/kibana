/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSiemMigrationsBaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';
import { siemMigrationsProductFeaturesConfig } from './product_feature_config';

export const getSiemMigrationsFeature = (): ProductFeatureParams => ({
  baseKibanaFeature: getSiemMigrationsBaseKibanaFeature(),
  productFeatureConfig: siemMigrationsProductFeaturesConfig,
});
