/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryBaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';
import {
  getAttackDiscoveryBaseKibanaSubFeatureIds,
  getAttackDiscoverySubFeaturesMap,
} from './kibana_sub_features';
import { attackDiscoveryProductFeaturesConfig } from './product_feature_config';
import type { ProductFeatureAttackDiscoveryKey } from '../product_features_keys';

export const getAttackDiscoveryFeature = (
  experimentalFeatures: Record<string, boolean>
): ProductFeatureParams<ProductFeatureAttackDiscoveryKey> => ({
  baseKibanaFeature: getAttackDiscoveryBaseKibanaFeature(),
  baseKibanaSubFeatureIds: getAttackDiscoveryBaseKibanaSubFeatureIds(),
  subFeaturesMap: getAttackDiscoverySubFeaturesMap(experimentalFeatures),
  productFeatureConfig: attackDiscoveryProductFeaturesConfig,
});
