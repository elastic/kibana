/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureAlertsKey } from '../product_features_keys';
import { getAlertsBaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';
import { alertsDefaultProductFeaturesConfig } from './product_feature_config';

export const getAlertsFeature = (): ProductFeatureParams<ProductFeatureAlertsKey, string> => ({
  baseKibanaFeature: getAlertsBaseKibanaFeature(),
  baseKibanaSubFeatureIds: [],
  subFeaturesMap: new Map(),
  productFeatureConfig: alertsDefaultProductFeaturesConfig,
});
