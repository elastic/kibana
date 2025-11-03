/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { CasesSubFeatureId } from '../../product_features_keys';
import { CASES_FEATURE_ID_V3 } from '../../constants';
import type { CasesFeatureParams } from '../types';
import {
  getDeleteCasesSubFeature,
  getCasesSettingsCasesSubFeature,
  getCasesAddCommentsCasesSubFeature,
  getCasesReopenCaseSubFeature,
} from '../kibana_sub_features';
import { addAllSubFeatureReplacements } from '../../utils';

/**
 * Sub-features that will always be available for Security Cases
 * regardless of the product type.
 */
export const getCasesBaseKibanaSubFeatureIdsV2 = (): CasesSubFeatureId[] => [
  CasesSubFeatureId.deleteCases,
  CasesSubFeatureId.casesSettings,
  CasesSubFeatureId.createComment,
  CasesSubFeatureId.reopenCase,
];

/**
 * Defines all the Security Solution Cases subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getCasesSubFeaturesMapV2 = (params: CasesFeatureParams) => {
  const subFeaturesMap = new Map<CasesSubFeatureId, SubFeatureConfig>([
    [CasesSubFeatureId.deleteCases, getDeleteCasesSubFeature(params)],
    [CasesSubFeatureId.casesSettings, getCasesSettingsCasesSubFeature(params)],
    /* The below sub features were newly added in v2 (8.17) */
    [CasesSubFeatureId.createComment, getCasesAddCommentsCasesSubFeature(params)],
    [CasesSubFeatureId.reopenCase, getCasesReopenCaseSubFeature(params)],
  ]);

  return addAllSubFeatureReplacements(subFeaturesMap, [{ feature: CASES_FEATURE_ID_V3 }]);
};
