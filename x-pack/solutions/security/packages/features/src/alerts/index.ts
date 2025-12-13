/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsBaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';
import type { SecurityFeatureParams } from '../security/types';
import { alertsDefaultProductFeaturesConfig } from './product_feature_config';

export const getAlertsFeature = (params: SecurityFeatureParams): ProductFeatureParams => ({
  baseKibanaFeature: getAlertsBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: [],
  subFeaturesMap: new Map(),
  productFeatureConfig: alertsDefaultProductFeaturesConfig,
});
