/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { RulesSubFeatureId } from '../../product_features_keys';
import {
  getCustomHighlightedFieldsSubFeature,
  getEnableDisableRulesSubFeature,
  getExceptionsSubFeature,
  getInvestigationGuideSubFeature,
} from '../kibana_sub_features';

export const getRulesBaseKibanaSubFeatureIdsV4 = (): RulesSubFeatureId[] => [
  RulesSubFeatureId.exceptions,
  RulesSubFeatureId.investigationGuide,
  RulesSubFeatureId.customHighlightedFields,
  RulesSubFeatureId.enableDisableRules,
];

/**
 * Defines all the Security Solution Rules subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getRulesSubFeaturesMapV4 = () => {
  return new Map<RulesSubFeatureId, SubFeatureConfig>([
    [RulesSubFeatureId.exceptions, getExceptionsSubFeature()],
    [RulesSubFeatureId.investigationGuide, getInvestigationGuideSubFeature()],
    [RulesSubFeatureId.customHighlightedFields, getCustomHighlightedFieldsSubFeature()],
    [RulesSubFeatureId.enableDisableRules, getEnableDisableRulesSubFeature()],
  ]);
};
