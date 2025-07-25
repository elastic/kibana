/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CasesProductFeaturesConfigMap,
  ProductFeatureKeys,
} from '@kbn/security-solution-features';
import {
  getCasesDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';

import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';

const casesProductFeaturesConfig = getCasesDefaultProductFeaturesConfig({
  apiTags: { connectors: GET_CONNECTORS_CONFIGURE_API_TAG },
  uiCapabilities: { connectors: CASES_CONNECTORS_CAPABILITY },
});

export const getCasesProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): CasesProductFeaturesConfigMap => {
    return createEnabledProductFeaturesConfigMap(
      casesProductFeaturesConfig,
      enabledProductFeatureKeys
    );
  };
