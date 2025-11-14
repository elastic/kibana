/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesV2BaseKibanaFeature } from './kibana_features';
import type { ProductFeatureParams } from '../types';
import type { SecurityFeatureParams } from '../security/types';
import { rulesDefaultProductFeaturesConfig } from './product_feature_config';
import { getExceptionsSubFeaturesMap } from './kibana_subfeatures';
import { EXCEPTIONS_SUBFEATURE_ID } from '../constants';

export const getRulesV2Feature = (params: SecurityFeatureParams): ProductFeatureParams => ({
  baseKibanaFeature: getRulesV2BaseKibanaFeature(params),
  baseKibanaSubFeatureIds: [EXCEPTIONS_SUBFEATURE_ID],
  subFeaturesMap: getExceptionsSubFeaturesMap(params.savedObjects),
  productFeatureConfig: rulesDefaultProductFeaturesConfig,
});
