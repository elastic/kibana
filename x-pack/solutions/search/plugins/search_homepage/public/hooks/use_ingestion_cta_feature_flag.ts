/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEARCH_HOMEPAGE_INGESTION_CTA_FEATURE_FLAG } from '@kbn/search-shared-ui/src/constants';
import { useKibana } from './use_kibana';

export const useIngestionCtaFeatureFlag = (): boolean => {
  const { cloud, featureFlags } = useKibana().services;
  if (cloud?.isServerlessEnabled !== true) return false;

  return featureFlags.getBooleanValue(SEARCH_HOMEPAGE_INGESTION_CTA_FEATURE_FLAG, false);
};
