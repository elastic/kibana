/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ILicense } from '@kbn/licensing-types';
import type { DetectionRulesAuthz } from '../../../../../../common/detection_engine/rule_management/authz';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { ProductFeaturesService } from '../../../../product_features_service';
import { createPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { RuleImportErrorObject } from '../import/errors';
import type {
  BulkDeleteRulesArgs,
  BulkDeleteRulesReturn,
  CreateCustomRuleArgs,
  DeleteRuleArgs,
  GetHistoryForRuleArgs,
  IDetectionRulesClient,
  ImportRulesArgs,
  InstallPrebuiltRulesArgs,
  InstallPrebuiltRulesResult,
  PatchRuleArgs,
  RevertPrebuiltRulesArgs,
  RevertPrebuiltRulesResult,
  UpdateRuleArgs,
  UpgradeAllPrebuiltRulesArgs,
  UpgradePrebuiltRulesArgs,
  UpgradePrebuiltRulesResult,
} from './detection_rules_client_interface';
import { createRule } from './methods/create_rule';
import { bulkDeleteRules } from './methods/bulk_delete_rules';
import { deleteRule } from './methods/delete_rule';
import { importRules } from './methods/import_rules';
import { installPrebuiltRules } from './methods/install_prebuilt_rules';
import { installAllPrebuiltRules } from './methods/install_all_prebuilt_rules';
import { upgradePrebuiltRules } from './methods/upgrade_prebuilt_rules';
import { upgradeAllPrebuiltRules } from './methods/upgrade_all_prebuilt_rules';
import { revertPrebuiltRules } from './methods/revert_prebuilt_rules';
import { patchRule } from './methods/patch_rule';
import { updateRule } from './methods/update_rule';
import { getHistoryForRule } from './methods/get_history_for_rule';
import { MINIMUM_RULE_CUSTOMIZATION_LICENSE } from '../../../../../../common/constants';

interface DetectionRulesClientParams {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  productFeaturesService: ProductFeaturesService;
  license: ILicense;
}

export const createDetectionRulesClient = ({
  actionsClient,
  rulesClient,
  mlAuthz,
  rulesAuthz,
  savedObjectsClient,
  productFeaturesService,
  license,
}: DetectionRulesClientParams): IDetectionRulesClient => {
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const prebuiltRuleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

  return {
    getRuleCustomizationStatus() {
      /**
       * The prebuilt rules customization feature is gated by the license level.
       *
       * The license level is verified against the minimum required level for
       * the feature (Enterprise). However, since Serverless always operates at
       * the Enterprise license level, we must also check if the feature is
       * enabled in the product features. In Serverless, for different tiers,
       * unavailable features are disabled.
       */
      const isRulesCustomizationEnabled =
        license.hasAtLeast(MINIMUM_RULE_CUSTOMIZATION_LICENSE) &&
        productFeaturesService.isEnabled(ProductFeatureKey.prebuiltRuleCustomization);

      return {
        isRulesCustomizationEnabled,
      };
    },
    async createCustomRule(args: CreateCustomRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createCustomRule', async () => {
        return createRule({
          rule: {
            ...args.params,
            // For backwards compatibility, we default to true if not provided.
            // The default enabled value is false for prebuilt rules, and true
            // for custom rules.
            enabled: args.params.enabled ?? true,
            immutable: false,
          },
          deps: { actionsClient, rulesClient, mlAuthz },
          changeTracking: args.changeTracking,
        });
      });
    },

    async updateRule({ ruleUpdate, changeTracking }: UpdateRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.updateRule', async () => {
        return updateRule({
          ruleUpdate,
          deps: { actionsClient, rulesClient, prebuiltRuleAssetClient, mlAuthz, rulesAuthz },
          changeTracking,
        });
      });
    },

    async patchRule({ rulePatch, changeTracking }: PatchRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.patchRule', async () => {
        return patchRule({
          rulePatch,
          deps: { actionsClient, rulesClient, prebuiltRuleAssetClient, mlAuthz, rulesAuthz },
          changeTracking,
        });
      });
    },

    async deleteRule({ ruleId }: DeleteRuleArgs): Promise<void> {
      return withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
        return deleteRule({ ruleId, rulesClient });
      });
    },

    async bulkDeleteRules({
      ruleIds,
      changeTracking,
    }: BulkDeleteRulesArgs): Promise<BulkDeleteRulesReturn> {
      return withSecuritySpan('DetectionRulesClient.bulkDeleteRules', async () => {
        return bulkDeleteRules({ ruleIds, rulesClient, changeTracking });
      });
    },

    async importRules(args: ImportRulesArgs): Promise<Array<RuleResponse | RuleImportErrorObject>> {
      return withSecuritySpan('DetectionRulesClient.importRules', async () => {
        return importRules({
          rulesToImport: args.rules,
          importOptions: {
            overwriteRules: args.overwriteRules,
            allowMissingConnectorSecrets: args.allowMissingConnectorSecrets,
          },
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            prebuiltRuleAssetClient,
            savedObjectsClient,
            ruleSourceImporter: args.ruleSourceImporter,
          },
          changeTracking: args.changeTracking,
        });
      });
    },

    async installPrebuiltRules(
      args: InstallPrebuiltRulesArgs
    ): Promise<InstallPrebuiltRulesResult> {
      return withSecuritySpan('DetectionRulesClient.installPrebuiltRules', async () => {
        return installPrebuiltRules({
          ...args,
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            ruleAssetsClient: prebuiltRuleAssetClient,
            ruleObjectsClient: prebuiltRuleObjectsClient,
          },
        });
      });
    },

    async installAllPrebuiltRules(): Promise<InstallPrebuiltRulesResult> {
      return withSecuritySpan('DetectionRulesClient.installAllPrebuiltRules', async () => {
        return installAllPrebuiltRules({
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            ruleAssetsClient: prebuiltRuleAssetClient,
            ruleObjectsClient: prebuiltRuleObjectsClient,
          },
        });
      });
    },

    async upgradePrebuiltRules(
      args: UpgradePrebuiltRulesArgs
    ): Promise<UpgradePrebuiltRulesResult> {
      return withSecuritySpan('DetectionRulesClient.upgradePrebuiltRules', async () => {
        return upgradePrebuiltRules({
          ...args,
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            ruleAssetsClient: prebuiltRuleAssetClient,
            ruleObjectsClient: prebuiltRuleObjectsClient,
          },
        });
      });
    },

    async upgradeAllPrebuiltRules(
      args: UpgradeAllPrebuiltRulesArgs
    ): Promise<UpgradePrebuiltRulesResult> {
      return withSecuritySpan('DetectionRulesClient.upgradeAllPrebuiltRules', async () => {
        return upgradeAllPrebuiltRules({
          ...args,
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            ruleAssetsClient: prebuiltRuleAssetClient,
            ruleObjectsClient: prebuiltRuleObjectsClient,
          },
        });
      });
    },

    async revertPrebuiltRules(args: RevertPrebuiltRulesArgs): Promise<RevertPrebuiltRulesResult> {
      return withSecuritySpan('DetectionRulesClient.revertPrebuiltRules', async () => {
        return revertPrebuiltRules({
          rules: args.rules,
          deps: {
            actionsClient,
            rulesClient,
            mlAuthz,
            prebuiltRuleAssetClient,
          },
        });
      });
    },

    async getHistoryForRule(args: GetHistoryForRuleArgs) {
      return withSecuritySpan('DetectionRulesClient.getHistoryForRule', async () => {
        return getHistoryForRule({ ...args, deps: { rulesClient } });
      });
    },
  };
};
