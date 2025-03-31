/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesSubFeatureId } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getCasesBaseKibanaFeature } from './v1_features/kibana_features';
import {
  getCasesBaseKibanaSubFeatureIds,
  getCasesSubFeaturesMap,
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

/**
 * @deprecated Use getCasesV2Feature instead
 */
export const getCasesFeature = (
  params: CasesFeatureParams
): ProductFeatureParams<CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIds(),
  subFeaturesMap: getCasesSubFeaturesMap(params),
});

export const getCasesV2Feature = (
  params: CasesFeatureParams
): ProductFeatureParams<CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeatureV2(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIdsV2(),
  subFeaturesMap: getCasesSubFeaturesMapV2(params),
});

export const getCasesV3Feature = (
  params: CasesFeatureParams
): ProductFeatureParams<CasesSubFeatureId> => ({
  baseKibanaFeature: getCasesBaseKibanaFeatureV3(params),
  baseKibanaSubFeatureIds: getCasesBaseKibanaSubFeatureIdsV3(),
  subFeaturesMap: getCasesSubFeaturesMapV3(params),
});
