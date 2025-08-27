/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecuritySubFeatureId } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getSecurityBaseKibanaFeature } from './v1_features/kibana_features';
import {
  getSecuritySubFeaturesMap,
  getSecurityBaseKibanaSubFeatureIds,
} from './v1_features/kibana_sub_features';
import { getSecurityV2BaseKibanaFeature } from './v2_features/kibana_features';
import {
  getSecurityV2SubFeaturesMap,
  getSecurityV2BaseKibanaSubFeatureIds,
} from './v2_features/kibana_sub_features';
import type { SecurityFeatureParams } from './types';
import { getSecurityV3BaseKibanaFeature } from './v3_features/kibana_features';
import {
  getSecurityV3BaseKibanaSubFeatureIds,
  getSecurityV3SubFeaturesMap,
} from './v3_features/kibana_sub_features';

/**
 * @deprecated Use getSecurityV2Feature instead
 */
export const getSecurityFeature = (
  params: SecurityFeatureParams
): ProductFeatureParams<SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityBaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecuritySubFeaturesMap(params),
});

/**
 * @deprecated Use getSecurityV3Feature instead
 */
export const getSecurityV2Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV2BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV2BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV2SubFeaturesMap(params),
});

export const getSecurityV3Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV3BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV3BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV3SubFeaturesMap(params),
});
