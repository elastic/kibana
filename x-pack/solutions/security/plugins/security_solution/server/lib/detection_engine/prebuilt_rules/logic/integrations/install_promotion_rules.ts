/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { BulkOperationError, RulesClient } from '@kbn/alerting-plugin/server';
import { SEARCH_AI_LAKE_PACKAGES } from '@kbn/fleet-plugin/common';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';
import type {
  RuleBootstrapError,
  RuleBootstrapResults,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_ease_rules/bootstrap_ease_rules.gen';
import { getErrorMessage } from '../../../../../utils/error_helpers';
import type { EndpointInternalFleetServicesInterface } from '../../../../../endpoint/services/fleet';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { PROMOTION_RULE_TAGS } from '../../../../../../common/constants';
import { getFleetPackageInstallation } from './get_fleet_package_installation';
import type { PromisePoolError } from '../../../../../utils/promise_pool';

interface InstallPromotionRulesParams {
  rulesClient: RulesClient;
  detectionRulesClient: IDetectionRulesClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  fleetServices: EndpointInternalFleetServicesInterface;
  logger: Logger;
}

/**
 * Install or upgrade promotion rules. These rules are needed for the EASE
 * tier integrations to work (promote alerts from external SIEMs).
 *
 * Note: due to current limitations, the promotion rules cannot be placed in
 * their corresponding packages and are shipped as part of the
 * security_detection_engine package. However, the promotion rules should only
 * be installed if the corresponding integration package is installed. The logic
 * is following: we go through the list of known EASE integrations and check
 * if their package are installed. Then for installed integrations, we need to
 * find corresponding promotion rules, they are tagged as Promotion, and install
 * or upgrade them to latest versions.
 *
 */
export async function installPromotionRules({
  rulesClient,
  detectionRulesClient,
  ruleAssetsClient,
  ruleObjectsClient,
  fleetServices,
  logger,
}: InstallPromotionRulesParams): Promise<RuleBootstrapResults> {
  logger.debug('installPromotionRules: Promotion rules - installing');
  // Get the list of installed integrations
  const installedIntegrations = new Set(
    (
      await Promise.all(
        SEARCH_AI_LAKE_PACKAGES.map(async (integration) => {
          const installation = await getFleetPackageInstallation(
            fleetServices,
            integration,
            logger
          );
          return installation ? integration : [];
        })
      )
    ).flat()
  );

  const latestRuleAssets = await ruleAssetsClient.fetchLatestAssets();

  const latestPromotionRules = latestRuleAssets.filter((rule) => {
    return (
      isPromotionRule(rule) &&
      rule.related_integrations?.some((integration) =>
        installedIntegrations.has(integration.package)
      )
    );
  });

  const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
  const installedRuleVersionsMap = new Map(
    installedRuleVersions.map((version) => [version.rule_id, version])
  );

  const promotionRulesToInstall = latestPromotionRules.filter(({ rule_id: ruleId }) => {
    return !installedRuleVersionsMap.has(ruleId);
  });

  const { installedRules, errors: installErrors } = await detectionRulesClient.installPrebuiltRules(
    {
      ruleSpecifiers: promotionRulesToInstall.map(({ rule_id, version }) => ({ rule_id, version })),
    }
  );

  // Promotion rules should be enabled by default
  if (installedRules.length > 0) {
    await Promise.all(installedRules.map((r) => rulesClient.enableRule({ id: r.id })));
  }

  const promotionRulesToUpgrade = latestPromotionRules.filter(({ rule_id: ruleId, version }) => {
    const installedVersion = installedRuleVersionsMap.get(ruleId);
    return installedVersion && installedVersion.version < version;
  });

  // Fetch current revisions for optimistic concurrency control
  const currentRules = await ruleObjectsClient.fetchInstalledRulesByIds({
    ruleIds: promotionRulesToUpgrade.map((r) => r.rule_id),
  });
  const revisionMap = new Map(currentRules.map((r) => [r.rule_id, r.revision]));

  const { updatedRules, errors: upgradeErrors } = await detectionRulesClient.upgradePrebuiltRules({
    ruleSpecifiers: promotionRulesToUpgrade.map(({ rule_id, version }) => ({
      rule_id,
      version,
      revision: revisionMap.get(rule_id) ?? 0,
    })),
    conflictResolutionStrategy: 'UPGRADE_SOLVABLE',
    defaultPickVersion: 'TARGET',
    isDryRun: false,
  });

  // Cleanup any unknown rules
  const rulesToDelete = installedRuleVersions.filter(({ rule_id: ruleId }) => {
    return !latestPromotionRules.some((rule) => rule.rule_id === ruleId);
  });
  const deletionErrors: BulkOperationError[] = [];
  if (rulesToDelete.length > 0) {
    const bulkDeleteResult = await rulesClient.bulkDeleteRules({
      ids: rulesToDelete.map(({ id }) => id),
    });
    deletionErrors.push(...bulkDeleteResult.errors);
  }

  const alreadyUpToDate = latestPromotionRules.filter(({ rule_id: ruleId, version }) => {
    const installedVersion = installedRuleVersionsMap.get(ruleId);
    return installedVersion && installedVersion.version === version;
  });

  const allPoolErrors: Array<PromisePoolError<{ rule_id: string }>> = [
    ...installErrors,
    ...upgradeErrors,
  ];

  const allErrors = [...allPoolErrors, ...deletionErrors].reduce((errorsMap, currentError) => {
    const errorMessage =
      'error' in currentError ? getErrorMessage(currentError.error) : currentError.message;
    const ruleId = 'item' in currentError ? currentError.item.rule_id : currentError.rule.id;
    const existingError = errorsMap.get(errorMessage);
    if (existingError) {
      existingError.rules.push({ rule_id: ruleId });
    } else {
      errorsMap.set(errorMessage, { rules: [{ rule_id: ruleId }], message: errorMessage });
    }
    return errorsMap;
  }, new Map<string, RuleBootstrapError>());

  const installationResult = {
    total: latestPromotionRules.length,
    installed: installedRules.length,
    updated: updatedRules.length,
    deleted: rulesToDelete.length,
    skipped: alreadyUpToDate.length,
    errors: allErrors.size > 0 ? Array.from(allErrors.values()) : [],
  };

  logger.debug(
    'installPromotionRules: Promotion rules - installation complete:',
    installationResult as LogMeta
  );

  return installationResult;
}

function isPromotionRule(rule: PrebuiltRuleAsset): boolean {
  return (rule.tags ?? []).some((tag) => PROMOTION_RULE_TAGS.includes(tag));
}
