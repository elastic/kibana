/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import { createDetectionIndex } from '../../../routes/index/create_index_route';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../../../common';
import { createPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRules } from '../rule_objects/create_prebuilt_rules';
import { ensureLatestRulesPackageInstalled } from './ensure_latest_rules_package_installed';

export interface InstallEndpointSecurityPrebuiltRuleProps {
  logger: Logger;
  context: SecuritySolutionApiRequestHandlerContext;
  request: KibanaRequest;
  alerts: AlertingServerStart;
  soClient: SavedObjectsClientContract;
}

/**
 * As part of a user taking advantage of the Elastic Defend (formerly Endpoint
 * Security) integration from within fleet, we attempt to install the `Endpoint
 * Security (Elastic Defend)` prebuilt rule which will be enabled by default.
 */
export const installEndpointSecurityPrebuiltRule = async ({
  logger,
  context,
  request,
  alerts,
  soClient,
}: InstallEndpointSecurityPrebuiltRuleProps): Promise<void> => {
  // Create detection index & rules (if necessary). move past any failure, this is just a convenience
  try {
    await createDetectionIndex(context);
  } catch (err) {
    if (err.statusCode !== 409) {
      // 409 -> detection index already exists, which is fine
      logger.warn(
        `Possible problem creating detection signals index (${err.statusCode}): ${err.message}`
      );
    }
  }
  try {
    const rulesClient = await alerts.getRulesClientWithRequest(request);
    const detectionRulesClient = context.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const exceptionsListClient = context.getExceptionListClient();

    const elasticDefendRule = await ruleObjectsClient.fetchInstalledRulesByIds({
      ruleIds: [ELASTIC_SECURITY_RULE_ID],
    });
    if (elasticDefendRule.length > 0) {
      // Elastic Defend rule already installed
      return;
    }
    // Elastic Defend rule not installed, find the latest version in the
    // prebuilt rule assets and install it

    // This will create the endpoint list if it does not exist yet
    await exceptionsListClient?.createEndpointList();

    // Make sure the latest prebuilt rules package is installed (in case the
    // user installs Elastic Defend integration without visiting Security
    // Solution first)
    await ensureLatestRulesPackageInstalled(ruleAssetsClient, context, logger);

    const latestRuleVersion = await ruleAssetsClient.fetchLatestVersions({
      ruleIds: [ELASTIC_SECURITY_RULE_ID],
    });

    if (latestRuleVersion.length === 0) {
      logger.error(
        `Unable to find Elastic Defend rule in the prebuilt rule assets (rule_id: ${ELASTIC_SECURITY_RULE_ID})`
      );
      return;
    }
    const ruleAssetsToInstall = await ruleAssetsClient.fetchAssetsByVersion(latestRuleVersion);
    await createPrebuiltRules(detectionRulesClient, ruleAssetsToInstall, logger);
  } catch (err) {
    logger.error(
      `Unable to create Endpoint Security rule automatically (${err.statusCode}): ${err.message}`
    );
  }
};
