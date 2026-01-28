/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { RulesSubFeatureId } from '../../product_features_keys';
import { getExceptionsSubFeature } from '../kibana_sub_features';
import { addAllSubFeatureReplacements } from '../../utils';
import { RULES_FEATURE_ID_V4 } from '../../constants';

export const getRulesBaseKibanaSubFeatureIdsV2 = (): RulesSubFeatureId[] => [
  RulesSubFeatureId.exceptions,
];

/**
 * Defines all the Security Solution Rules subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getRulesSubFeaturesMapV2 = () => {
  const subFeaturesList = new Map<RulesSubFeatureId, SubFeatureConfig>([
    [RulesSubFeatureId.exceptions, getExceptionsSubFeature()],
  ]);

  return addAllSubFeatureReplacements(subFeaturesList, [{ feature: RULES_FEATURE_ID_V4 }]);
};
