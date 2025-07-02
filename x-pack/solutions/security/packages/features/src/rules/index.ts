/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesBaseKibanaFeature } from './kibana_features';
import { getExceptionsSubFeaturesMapV3 } from './kibana_sub_features';
import type { ProductFeatureParams } from '../types';
import type { SecurityFeatureParams } from '../security/types';
import { EXCEPTIONS_FEATURE_ID } from '../constants';

export const getRulesFeature = (params: SecurityFeatureParams): ProductFeatureParams => ({
  baseKibanaFeature: getRulesBaseKibanaFeature({
    ...params,
    savedObjects: params.savedObjects.filter(
      (savedObjectType) => savedObjectType !== 'exceptions-list'
    ),
  }),
  baseKibanaSubFeatureIds: [EXCEPTIONS_FEATURE_ID],
  subFeaturesMap: getExceptionsSubFeaturesMapV3(
    params.savedObjects.filter((savedObjectType) => savedObjectType === 'exceptions-list')
  ),
});
