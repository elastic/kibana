/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeaturesConfig } from '@kbn/security-solution-features';
import type {
  SecuritySubFeatureId,
  CasesSubFeatureId,
  AssistantSubFeatureId,
} from '@kbn/security-solution-features/keys';

export interface ProductFeaturesConfigurator {
  attackDiscovery: () => ProductFeaturesConfig;
  security: () => ProductFeaturesConfig<SecuritySubFeatureId>;
  cases: () => ProductFeaturesConfig<CasesSubFeatureId>;
  securityAssistant: () => ProductFeaturesConfig<AssistantSubFeatureId>;
  timeline: () => ProductFeaturesConfig;
  notes: () => ProductFeaturesConfig;
}
