/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ProductFeaturesConfigurator } from '@kbn/security-solution-features';
import { getEnabledProductFeatures } from '../../common/pli/pli_features';
import { getCasesProductFeaturesConfigurator } from './cases_product_features_config';
import { getSecurityProductFeaturesConfigurator } from './security_product_features_config';
import { getSecurityAssistantProductFeaturesConfigurator } from './assistant_product_features_config';
import { getAttackDiscoveryProductFeaturesConfigurator } from './attack_discovery_product_features_config';
import {
  getTimelineProductFeaturesConfigurator,
  getNonTimelineProductFeaturesConfigurator,
} from './timeline_product_features_config';
import {
  getNotesProductFeaturesConfigurator,
  getNonNotesProductFeaturesConfigurator,
} from './notes_product_features_config';
import { getSiemMigrationsProductFeaturesConfigurator } from './siem_migrations_product_features_config';
import { enableRuleActions } from '../rules/enable_rule_actions';
import type { ServerlessSecurityConfig } from '../config';
import type { Tier, SecuritySolutionServerlessPluginSetupDeps } from '../types';
import { ProductLine, ProductTier } from '../../common/product';

export const registerProductFeatures = (
  pluginsSetup: SecuritySolutionServerlessPluginSetupDeps,
  config: ServerlessSecurityConfig
): void => {
  // securitySolutionEss plugin should always be disabled when securitySolutionServerless is enabled.
  // This check is an additional layer of security to prevent double registrations when
  // `plugins.forceEnableAllPlugins` flag is enabled. Should never happen in real scenarios.
  const shouldRegister = pluginsSetup.securitySolutionEss == null;
  if (!shouldRegister) {
    return;
  }

  // Register product features
  const enabledProductFeatureKeys = getEnabledProductFeatures(config.productTypes);
  const productLines = Object.fromEntries(
    config.productTypes.map((productType) => [productType.product_line, true])
  );
  const productTiers = Object.fromEntries(
    config.productTypes.map((productType) => [productType.product_tier, true])
  );

  const configurator: ProductFeaturesConfigurator = {};
  // Cases are always enabled (both for security and AI-SOC)
  configurator.cases = getCasesProductFeaturesConfigurator(enabledProductFeatureKeys);

  if (productLines[ProductLine.security]) {
    // TODO: clarify what happens with siem migrations
    if (!config.experimentalFeatures.siemMigrationsDisabled) {
      configurator.siemMigrations =
        getSiemMigrationsProductFeaturesConfigurator(enabledProductFeatureKeys);
    }
    configurator.security = getSecurityProductFeaturesConfigurator(
      enabledProductFeatureKeys,
      config.experimentalFeatures
    );

    // timeline and notes are not available for the searchAiLake tier within Security
    configurator.timeline = productTiers[ProductTier.searchAiLake]
      ? getNonTimelineProductFeaturesConfigurator(enabledProductFeatureKeys)
      : getTimelineProductFeaturesConfigurator(enabledProductFeatureKeys);
    configurator.notes = productTiers[ProductTier.searchAiLake]
      ? getNonNotesProductFeaturesConfigurator(enabledProductFeatureKeys)
      : getNotesProductFeaturesConfigurator(enabledProductFeatureKeys);
  }

  if (productLines[ProductLine.aiSoc]) {
    configurator.attackDiscovery =
      getAttackDiscoveryProductFeaturesConfigurator(enabledProductFeatureKeys);
    configurator.securityAssistant =
      getSecurityAssistantProductFeaturesConfigurator(enabledProductFeatureKeys);
  }

  // register product features for the main security solution product features service
  pluginsSetup.securitySolution.setProductFeaturesConfigurator(configurator);

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
