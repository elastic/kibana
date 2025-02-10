/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import { getCasesProductFeaturesConfigurator } from './cases_product_features_config';
import { getSecurityProductFeaturesConfigurator } from './security_product_features_config';
import { getSecurityAssistantProductFeaturesConfigurator } from './assistant_product_features_config';
import { getAttackDiscoveryProductFeaturesConfigurator } from './attack_discovery_product_features_config';
import { getTimelineProductFeaturesConfigurator } from './timeline_product_features_config';
import { getNotesProductFeaturesConfigurator } from './notes_product_features_config';
import { getSiemMigrationsProductFeaturesConfigurator } from './siem_migrations_product_features_config';
import { enableRuleActions } from '../rules/enable_rule_actions';
import type { ServerlessSecurityConfig } from '../config';
import type { Tier, SecuritySolutionServerlessPluginSetupDeps } from '../types';
import { ProductLine } from '../../common/product';

export const registerProductFeatures = (
  pluginsSetup: SecuritySolutionServerlessPluginSetupDeps,
  enabledProductFeatureKeys: ProductFeatureKeys,
  config: ServerlessSecurityConfig
): void => {
  // securitySolutionEss plugin should always be disabled when securitySolutionServerless is enabled.
  // This check is an additional layer of security to prevent double registrations when
  // `plugins.forceEnableAllPlugins` flag is enabled. Should never happen in real scenarios.
  const shouldRegister = pluginsSetup.securitySolutionEss == null;
  if (!shouldRegister) {
    return;
  }

  // register product features for the main security solution product features service
  pluginsSetup.securitySolution.setProductFeaturesConfigurator({
    security: getSecurityProductFeaturesConfigurator(
      enabledProductFeatureKeys,
      config.experimentalFeatures
    ),
    cases: getCasesProductFeaturesConfigurator(enabledProductFeatureKeys),
    securityAssistant: getSecurityAssistantProductFeaturesConfigurator(enabledProductFeatureKeys),
    attackDiscovery: getAttackDiscoveryProductFeaturesConfigurator(enabledProductFeatureKeys),
    timeline: getTimelineProductFeaturesConfigurator(enabledProductFeatureKeys),
    notes: getNotesProductFeaturesConfigurator(enabledProductFeatureKeys),
    siemMigrations: getSiemMigrationsProductFeaturesConfigurator(enabledProductFeatureKeys),
  });

  // enable rule actions based on the enabled product features
  enableRuleActions({
    actions: pluginsSetup.actions,
    productFeatureKeys: enabledProductFeatureKeys,
  });

  // set availability for the automatic import plugin based on the product features
  pluginsSetup.automaticImport?.setIsAvailable(
    enabledProductFeatureKeys.includes(ProductFeatureKey.automaticImport)
  );
};

/**
 * Get the security product tier from the security product type in the config
 */
export const getSecurityProductTier = (config: ServerlessSecurityConfig, logger: Logger): Tier => {
  const securityProductType = config.productTypes.find(
    (productType) => productType.product_line === ProductLine.security
  );
  const tier = securityProductType ? securityProductType.product_tier : 'none';
  if (tier === 'none') {
    logger.error(`Failed to fetch security product tier, config: ${JSON.stringify(config)}`);
  }

  return tier;
};
