/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AssistantSubFeatureId, ProductFeatureAssistantKey } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getAssistantBaseKibanaFeature } from './kibana_features';
import {
  getAssistantBaseKibanaSubFeatureIds,
  getAssistantSubFeaturesMap,
} from './kibana_sub_features';
import { assistantProductFeaturesConfig } from './product_feature_config';

export const getAssistantFeature = (
  experimentalFeatures: Record<string, boolean>
): ProductFeatureParams<ProductFeatureAssistantKey, AssistantSubFeatureId> => ({
  baseKibanaFeature: getAssistantBaseKibanaFeature(),
  baseKibanaSubFeatureIds: getAssistantBaseKibanaSubFeatureIds(),
  subFeaturesMap: getAssistantSubFeaturesMap(experimentalFeatures),
  productFeatureConfig: assistantProductFeaturesConfig,
});
