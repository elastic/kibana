/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { CasesSubFeatureId } from '../../product_features_keys';
import type { CasesFeatureParams } from '../types';
import {
  getCasesAddCommentsCasesSubFeature,
  getCasesAssignUsersCasesSubFeature,
  getCasesReopenCaseSubFeature,
  getCasesSettingsCasesSubFeature,
  getDeleteCasesSubFeature,
} from '../kibana_sub_features';

/**
 * Sub-features that will always be available for Security Cases
 * regardless of the product type.
 */
export const getCasesBaseKibanaSubFeatureIdsV3 = (): CasesSubFeatureId[] => [
  CasesSubFeatureId.deleteCases,
  CasesSubFeatureId.casesSettings,
  CasesSubFeatureId.createComment,
  CasesSubFeatureId.reopenCase,
  CasesSubFeatureId.assignUsers,
];

export const getCasesSubFeaturesMapV3 = (params: CasesFeatureParams) => {
  return new Map<CasesSubFeatureId, SubFeatureConfig>([
    [CasesSubFeatureId.deleteCases, getDeleteCasesSubFeature(params)],
    [CasesSubFeatureId.casesSettings, getCasesSettingsCasesSubFeature(params)],
    [CasesSubFeatureId.createComment, getCasesAddCommentsCasesSubFeature(params)],
    [CasesSubFeatureId.reopenCase, getCasesReopenCaseSubFeature(params)],
    /* The below sub features were newly added in V3 */
    [CasesSubFeatureId.assignUsers, getCasesAssignUsersCasesSubFeature(params)],
  ]);
};
