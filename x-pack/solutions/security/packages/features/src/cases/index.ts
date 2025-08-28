/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesSubFeatureId, ProductFeatureCasesKey } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getCasesBaseKibanaFeature } from './v1_features/kibana_features';
import {
  getCasesBaseKibanaSubFeatureIdsV1,
  getCasesSubFeaturesMapV1,
} from './v1_features/kibana_sub_features';
import type { CasesFeatureParams } from './types';
import { getCasesBaseKibanaFeatureV2 } from './v2_features/kibana_features';
import {
  getCasesBaseKibanaSubFeatureIdsV2,
  getCasesSubFeaturesMapV2,
} from './v2_features/kibana_sub_features';
import { getCasesBaseKibanaFeatureV3 } from './v3_features/kibana_features';
import {
  getCasesBaseKibanaSubFeatureIdsV3,
  getCasesSubFeaturesMapV3,
} from './v3_features/kibana_sub_features';
import { getCasesProductFeaturesConfig } from './product_feature_config';

export const getCasesFeature = (
  params: CasesFeatureParams
): ProductFeatureParams<ProductFeatureCasesKey, CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIdsV1(),
  subFeaturesMap: getCasesSubFeaturesMapV1(params),
  productFeatureConfig: getCasesProductFeaturesConfig(params),
});

export const getCasesV2Feature = (
  params: CasesFeatureParams
): ProductFeatureParams<ProductFeatureCasesKey, CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeatureV2(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIdsV2(),
  subFeaturesMap: getCasesSubFeaturesMapV2(params),
  productFeatureConfig: getCasesProductFeaturesConfig(params),
});

export const getCasesV3Feature = (
  params: CasesFeatureParams
): ProductFeatureParams<ProductFeatureCasesKey, CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeatureV3(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIdsV3(),
  subFeaturesMap: getCasesSubFeaturesMapV3(params),
  productFeatureConfig: getCasesProductFeaturesConfig(params),
});
