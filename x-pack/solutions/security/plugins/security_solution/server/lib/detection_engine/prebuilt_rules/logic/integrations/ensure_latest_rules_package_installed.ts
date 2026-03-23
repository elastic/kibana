/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import { installPrebuiltRulesPackage } from './install_prebuilt_rules_package';

export async function ensureLatestRulesPackageInstalled(
  ruleAssetsClient: IPrebuiltRuleAssetsClient,
  securityContext: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
) {
  logger.debug(
    'ensureLatestRulesPackageInstalled: Fetching latest versions of prebuilt rule assets'
  );
  let latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  logger.debug(
    `ensureLatestRulesPackageInstalled: Fetching latest versions of prebuilt rule assets - done. Fetched assets: ${latestPrebuiltRules.length}.`
  );
  if (latestPrebuiltRules.length === 0) {
    // Seems no packages with prepackaged rules were installed, try to install the default rules package
    await installPrebuiltRulesPackage(securityContext, logger);

    logger.debug(
      'ensureLatestRulesPackageInstalled: Re-fetching latest versions of prebuilt rule assets after package installation'
    );
    latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
    logger.debug(
      `ensureLatestRulesPackageInstalled: Re-fetched latest versions of prebuilt rule assets after package installation - done. Fetched assets: ${latestPrebuiltRules.length}.`
    );
  }
  return latestPrebuiltRules;
}
