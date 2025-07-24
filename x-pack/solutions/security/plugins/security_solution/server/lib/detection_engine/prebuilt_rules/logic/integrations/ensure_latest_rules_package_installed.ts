/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import { installPrebuiltRulesPackage } from './install_prebuilt_rules_package';

export async function ensureLatestRulesPackageInstalled(
  ruleAssetsClient: IPrebuiltRuleAssetsClient,
  securityContext: SecuritySolutionApiRequestHandlerContext,
  logDebug: (message: string) => void = (message: string) => {}
) {
  logDebug('ENSURE LATEST PACKAGE INSTALLED - fetching latest assets');
  let latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  logDebug(
    `ENSURE LATEST PACKAGE INSTALLED - fetched latest assets. Assets count: ${latestPrebuiltRules.length}`
  );
  if (latestPrebuiltRules.length === 0) {
    // Seems no packages with prepackaged rules were installed, try to install the default rules package
    await installPrebuiltRulesPackage(securityContext, logDebug);

    logDebug('ENSURE LATEST PACKAGE INSTALLED - fetching latest assets again');
    // Try to get the prepackaged rules again
    latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  }
  logDebug(`ENSURE LATEST PACKAGE INSTALLED complete. Assets count: ${latestPrebuiltRules.length}`);
  return latestPrebuiltRules;
}
