/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationError, RulesClient } from '@kbn/alerting-plugin/server';
import { SEARCH_AI_LAKE_PACKAGES } from '@kbn/fleet-plugin/common';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRules } from '../rule_objects/create_prebuilt_rules';
import type { IPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';
import { upgradePrebuiltRules } from '../rule_objects/upgrade_prebuilt_rules';
import type {
  RuleBootstrapError,
  RuleBootstrapResults,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import { getErrorMessage } from '../../../../../utils/error_helpers';
import type { EndpointInternalFleetServicesInterface } from '../../../../../endpoint/services/fleet';
import { PROMOTION_RULE_TAGS } from '../../../../../../common/constants';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

interface InstallPromotionRulesParams {
  rulesClient: RulesClient;
  detectionRulesClient: IDetectionRulesClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  fleetServices: EndpointInternalFleetServicesInterface;
}

/**
 * Install or upgrade promotion rules. These rules are needed for the AI4SOC
 * tier integrations to work (promote alerts from external SIEMs).
 *
 * Note: due to current limitations, the promotion rules cannot be placed in
 * their corresponding packages and are shipped as part of the
 * security_detection_engine package. However, the promotion rules should only
 * be installed if the corresponding integration package is installed. The logic
 * is following: we go through the list of known AI4SOC integrations and check
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
}: InstallPromotionRulesParams): Promise<RuleBootstrapResults> {
  // Get the list of installed integrations
  const installedIntegrations = new Set(
    (
      await Promise.all(
        SEARCH_AI_LAKE_PACKAGES.map(async (integration) => {
          // We don't care about installation status of the integration as all
          // AI4SOC integrations are agentless (don't require setting up an
          // integration policy). So the fact that the corresponding package is
          // installed is enough.
          const installation = await fleetServices.packages.getInstallation(integration);
          return installation ? integration : [];
        })
      )
    ).flat()
  );

  const latestRuleAssets = await ruleAssetsClient.fetchLatestAssets();

  const latestPromotionRules = latestRuleAssets.filter((rule) => {
    // Rule should be tagged as 'Promotion' and should be related to an enabled integration
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
  const { results: installationResults, errors: installationErrors } = await createPrebuiltRules(
    detectionRulesClient,
    promotionRulesToInstall.map((asset) => ({
      ...asset,
      enabled: true,
    }))
  );

  const promotionRulesToUpgrade = latestPromotionRules.filter(({ rule_id: ruleId, version }) => {
    const installedVersion = installedRuleVersionsMap.get(ruleId);
    return installedVersion && installedVersion.version < version;
  });
  const { results: upgradeResults, errors: upgradeErrors } = await upgradePrebuiltRules(
    detectionRulesClient,
    promotionRulesToUpgrade
  );

  // Cleanup any unknown rules, we don't allow users to install any detection
  // rules that are not part of the enabled integrations, although that is not
  // enforced via the API
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

  const allErrors = [...installationErrors, ...upgradeErrors, ...deletionErrors].reduce(
    (errorsMap, currentError) => {
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
    },
    new Map<string, RuleBootstrapError>()
  );

  return {
    total: latestPromotionRules.length,
    installed: installationResults.length,
    updated: upgradeResults.length,
    deleted: rulesToDelete.length,
    skipped: alreadyUpToDate.length,
    errors: allErrors.size > 0 ? Array.from(allErrors.values()) : [],
  };
}

function isPromotionRule(rule: PrebuiltRuleAsset): boolean {
  return (rule.tags ?? []).some((tag) => PROMOTION_RULE_TAGS.includes(tag));
}
