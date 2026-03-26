/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ProductFeatureSecurityKey, SecuritySubFeatureId } from '../product_features_keys';
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
import { securityDefaultProductFeaturesConfig } from './product_feature_config';
import { securityV1ProductFeaturesConfig } from './v1_features/product_feature_config';
import { securityV2ProductFeaturesConfig } from './v2_features/product_feature_config';
import { getSecurityV4BaseKibanaFeature } from './v4_features/kibana_features';
import {
  getSecurityV4BaseKibanaSubFeatureIds,
  getSecurityV4SubFeaturesMap,
} from './v4_features/kibana_sub_features';
import { getSecurityV5BaseKibanaFeature } from './v5_features/kibana_features';
import {
  getSecurityV5BaseKibanaSubFeatureIds,
  getSecurityV5SubFeaturesMap,
} from './v5_features/kibana_sub_features';

export const getSecurityFeature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureSecurityKey, SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityBaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityBaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecuritySubFeaturesMap(params),
  productFeatureConfig: securityV1ProductFeaturesConfig,
});

export const getSecurityV2Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureSecurityKey, SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV2BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV2BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV2SubFeaturesMap(params),
  productFeatureConfig: securityV2ProductFeaturesConfig,
});

export const getSecurityV3Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureSecurityKey, SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV3BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV3BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV3SubFeaturesMap(params),
  productFeatureConfig: securityDefaultProductFeaturesConfig,
});

export const getSecurityV4Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureSecurityKey, SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV4BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV4BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV4SubFeaturesMap(params),
  productFeatureConfig: securityDefaultProductFeaturesConfig,
});

export const getSecurityV5Feature = (
  params: SecurityFeatureParams
): ProductFeatureParams<ProductFeatureSecurityKey, SecuritySubFeatureId> => ({
  baseKibanaFeature: getSecurityV5BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: getSecurityV5BaseKibanaSubFeatureIds(params),
  subFeaturesMap: getSecurityV5SubFeaturesMap(params),
  productFeatureConfig: securityDefaultProductFeaturesConfig,
});
