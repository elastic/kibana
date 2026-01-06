/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesUiCapabilities, CasesApiTags } from '@kbn/cases-plugin/common';
import type { ProductFeatureCasesKey, CasesSubFeatureId } from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

export interface CasesFeatureParams {
  apiTags: {
    default: CasesApiTags;
    connectors: Pick<CasesApiTags, 'all' | 'read'>;
  };
  uiCapabilities: {
    default: CasesUiCapabilities;
    connectors: Pick<CasesUiCapabilities, 'all' | 'read'>;
  };
  savedObjects: { files: string[] };
}

export type CasesProductFeaturesConfig = ProductFeaturesConfig<
  ProductFeatureCasesKey,
  CasesSubFeatureId
>;
