/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesBaseKibanaFeature } from './v1_features/kibana_features';
import type { ProductFeatureParams } from '../types';
import type { SecurityFeatureParams } from '../security/types';
import { rulesDefaultProductFeaturesConfig } from './product_feature_config';
import { getRulesV2BaseKibanaFeature } from './v2_features/kibana_features';
import {
  getRulesBaseKibanaSubFeatureIdsV2,
  getRulesSubFeaturesMapV2,
} from './v2_features/kibana_sub_features';
import type { ProductFeatureRulesKey, RulesSubFeatureId } from '../product_features_keys';
import { getRulesBaseKibanaSubFeatureIdsV3, getRulesSubFeaturesMapV3 } from './v3_features/kibana_sub_features';
import { getRulesV3BaseKibanaFeature } from './v3_features/kibana_features';

export const getRulesFeature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureRulesKey, RulesSubFeatureId> => ({
  baseKibanaFeature: getRulesBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: [],
  subFeaturesMap: new Map(),
  productFeatureConfig: rulesDefaultProductFeaturesConfig,
});

export const getRulesV2Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureRulesKey, RulesSubFeatureId> => ({
  baseKibanaFeature: getRulesV2BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getRulesBaseKibanaSubFeatureIdsV2(),
  subFeaturesMap: getRulesSubFeaturesMapV2(),
  productFeatureConfig: rulesDefaultProductFeaturesConfig,
});

export const getRulesV3Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureRulesKey, RulesSubFeatureId> => ({
  baseKibanaFeature: getRulesV3BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getRulesBaseKibanaSubFeatureIdsV3(),
  subFeaturesMap: getRulesSubFeaturesMapV3(),
  productFeatureConfig: rulesDefaultProductFeaturesConfig,
});
