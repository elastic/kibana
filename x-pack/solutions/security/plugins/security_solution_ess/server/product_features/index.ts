/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ProductFeatureKeys,
  ProductFeaturesConfigurator,
} from '@kbn/security-solution-features';
import { getCasesProductFeaturesConfigurator } from './cases_product_features_config';
import { getSecurityProductFeaturesConfigurator } from './security_product_features_config';
import { getSecurityAssistantProductFeaturesConfigurator } from './assistant_product_features_config';
import { getAttackDiscoveryProductFeaturesConfigurator } from './attack_discovery_product_features_config';
import { getTimelineProductFeaturesConfigurator } from './timeline_product_features_config';
import { getNotesProductFeaturesConfigurator } from './notes_product_features_config';
import { getSiemMigrationsProductFeaturesConfigurator } from './siem_migrations_product_features_config';

export const getProductProductFeaturesConfigurator = (
  enabledProductFeatureKeys: ProductFeatureKeys
): ProductFeaturesConfigurator => {
  return {
    security: getSecurityProductFeaturesConfigurator(enabledProductFeatureKeys),
    cases: getCasesProductFeaturesConfigurator(enabledProductFeatureKeys),
    securityAssistant: getSecurityAssistantProductFeaturesConfigurator(enabledProductFeatureKeys),
    attackDiscovery: getAttackDiscoveryProductFeaturesConfigurator(enabledProductFeatureKeys),
    timeline: getTimelineProductFeaturesConfigurator(enabledProductFeatureKeys),
    notes: getNotesProductFeaturesConfigurator(enabledProductFeatureKeys),
    siemMigrations: getSiemMigrationsProductFeaturesConfigurator(enabledProductFeatureKeys),
  };
};
