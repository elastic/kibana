/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  AnalyticsServiceSetup,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';

import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ILicense } from '@kbn/licensing-types';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { DetectionRulesAuthz } from '../../../../../../common/detection_engine/rule_management/authz';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { SecuritySolutionEventBus } from '../../../../../events/event_bus';
import type { DetectionRulesCreatedSource } from '../../../../../../common/workflows/triggers';
import {
  emitDetectionRulesCreatedInChunks,
  toCreatedRuleSummary,
  type CreatedRuleSummary,
} from '../../../../../workflows/triggers/emit_rules_created';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { ProductFeaturesService } from '../../../../product_features_service';
import { createPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { ImportRulesResult } from './methods/import_rules';
import type {
  BulkDeleteRulesArgs,
  BulkDeleteRulesReturn,
  CreateCustomRuleArgs,
  CreatePrebuiltRuleArgs,
  DeleteRuleArgs,
  GetHistoryForRuleArgs,
  IDetectionRulesClient,
  ImportRulesArgs,
  NotifyRulesCreatedArgs,
  PatchRuleArgs,
  RestoreRuleFromHistoryArgs,
  RevertPrebuiltRuleArgs,
  UpdateRuleArgs,
  UpgradePrebuiltRuleArgs,
  BulkCreatePrebuiltRulesArgs,
} from './detection_rules_client_interface';
import type { RestoreRuleFromHistoryResponse } from '../../../../../../common/api/detection_engine/rule_management';
import { createRule } from './methods/create_rule';
import { bulkCreatePrebuiltRules } from './methods/bulk_create_prebuilt_rules';
import { bulkDeleteRules } from './methods/bulk_delete_rules';
import { deleteRule } from './methods/delete_rule';
import { importRules } from './methods/import_rules';
import { patchRule } from './methods/patch_rule';
import { updateRule } from './methods/update_rule';
import { upgradePrebuiltRule } from './methods/upgrade_prebuilt_rule';
import { revertPrebuiltRule } from './methods/revert_prebuilt_rule';
import { getHistoryForRule } from './methods/get_history_for_rule';
import { restoreRuleFromHistory } from './methods/restore_rule_from_history';
import { RULE_IMPORT_BATCH_SIZE } from '../../api/constants';
import { MINIMUM_RULE_CUSTOMIZATION_LICENSE } from '../../../../../../common/constants';
import {
  sendRuleRestoreTelemetryEvent,
  sendRuleRestoreErrorTelemetryEvent,
} from './restore_telemetry';
import {
  sendRuleLifecycleTelemetryEvent,
  sendRuleInstallTelemetryEvents,
  sendRuleImportTelemetryEvents,
} from './rule_lifecycle_telemetry';
import {
  DETECTION_RULE_REVERT_EVENT,
  DETECTION_RULE_INSTALL_EVENT,
} from '../../../../telemetry/event_based/events';

interface DetectionRulesClientParams {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  userProfile: UserProfileServiceStart;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  productFeaturesService: ProductFeaturesService;
  license: ILicense;
  analytics?: AnalyticsServiceSetup;
  logger?: Logger;
  /** Both are needed to emit `detectionRulesCreated`; omit either to skip emitting. */
  eventBus?: SecuritySolutionEventBus;
  request?: KibanaRequest;
}

export const createDetectionRulesClient = ({
  actionsClient,
  rulesClient,
  userProfile,
  mlAuthz,
  rulesAuthz,
  savedObjectsClient,
  productFeaturesService,
  license,
  analytics,
  logger,
  eventBus,
  request,
}: DetectionRulesClientParams): IDetectionRulesClient => {
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

  const emitRulesCreated = (
    rules: readonly CreatedRuleSummary[],
    source: DetectionRulesCreatedSource
  ): void => {
    if (!eventBus || !request) return;
    emitDetectionRulesCreatedInChunks({ eventBus, request, rules, source, logger });
  };

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
    notifyRulesCreated({ rules, source }: NotifyRulesCreatedArgs): void {
      // Observability only: it must never fail the creation that already succeeded.
      try {
        emitRulesCreated(rules.map(toCreatedRuleSummary), source);
      } catch (err) {
        logger?.warn(`Failed to notify detectionRulesCreated workflow trigger: ${err}`);
      }
    },

    async createCustomRule(args: CreateCustomRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createCustomRule', async () => {
        const rule = await createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            // For backwards compatibility, we default to true if not provided.
            // The default enabled value is false for prebuilt rules, and true
            // for custom rules.
            enabled: args.params.enabled ?? true,
            immutable: false,
          },
          mlAuthz,
          changeTracking: args.changeTracking,
        });

        if (!args.suppressCreatedEvent) {
          emitRulesCreated([toCreatedRuleSummary(rule)], 'api');
        }

        return rule;
      });
    },

    async createPrebuiltRule(args: CreatePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createPrebuiltRule', async () => {
        const rule = await createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            immutable: true,
          },
          mlAuthz,
          changeTracking: {
            action: SecurityRuleChangeTrackingAction.ruleInstall,
            ...args.changeTracking,
          },
        });

        if (analytics) {
          sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule, logger);
        }

        if (!args.suppressCreatedEvent) {
          emitRulesCreated([toCreatedRuleSummary(rule)], 'prebuilt_install');
        }

        return rule;
      });
    },

    async bulkCreatePrebuiltRules(args: BulkCreatePrebuiltRulesArgs) {
      return withSecuritySpan('DetectionRulesClient.bulkCreatePrebuiltRules', async () => {
        const result = await bulkCreatePrebuiltRules({ actionsClient, rulesClient, mlAuthz, args });

        if (analytics) {
          sendRuleInstallTelemetryEvents(
            analytics,
            { rules: args.rules, results: result.results },
            logger
          );
        }

        const assetsByRuleId = new Map(args.rules.map((asset) => [asset.rule_id, asset]));
        emitRulesCreated(
          result.results.flatMap(({ id, rule_id: ruleId }) => {
            const asset = assetsByRuleId.get(ruleId);
            return asset ? [{ id, type: asset.type, tags: asset.tags }] : [];
          }),
          'prebuilt_install'
        );

        return result;
      });
    },

    async updateRule({ ruleUpdate, changeTracking }: UpdateRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.updateRule', async () => {
        return updateRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleUpdate,
          changeTracking,
        });
      });
    },

    async patchRule({ rulePatch, changeTracking }: PatchRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.patchRule', async () => {
        return patchRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          rulePatch,
          changeTracking,
        });
      });
    },

    async deleteRule({ ruleId }: DeleteRuleArgs): Promise<void> {
      return withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
        return deleteRule({ rulesClient, ruleId });
      });
    },

    async bulkDeleteRules({
      ruleIds,
      changeTracking,
    }: BulkDeleteRulesArgs): Promise<BulkDeleteRulesReturn> {
      return withSecuritySpan('DetectionRulesClient.bulkDeleteRules', async () => {
        return bulkDeleteRules({ rulesClient, ruleIds, changeTracking });
      });
    },

    async upgradePrebuiltRule({
      ruleAsset,
      changeTracking,
    }: UpgradePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.upgradePrebuiltRule', async () => {
        return upgradePrebuiltRule({
          actionsClient,
          rulesClient,
          ruleAsset,
          mlAuthz,
          prebuiltRuleAssetClient,
          changeTracking,
        });
      });
    },

    async revertPrebuiltRule({
      ruleAsset,
      existingRule,
      changeTracking,
    }: RevertPrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.revertPrebuiltRule', async () => {
        const rule = await revertPrebuiltRule({
          actionsClient,
          rulesClient,
          ruleAsset,
          mlAuthz,
          prebuiltRuleAssetClient,
          existingRule,
          changeTracking,
        });

        if (analytics) {
          sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_REVERT_EVENT, rule, logger);
        }

        return rule;
      });
    },

    async importRules(args: ImportRulesArgs): Promise<ImportRulesResult> {
      return withSecuritySpan('DetectionRulesClient.importRules', async () => {
        const result = await importRules({
          rules: args.rules,
          options: {
            overwriteRules: args.overwriteRules,
            allowMissingConnectorSecrets: args.allowMissingConnectorSecrets,
            changeTracking: args.changeTracking,
            batchSize: args.batchSize ?? RULE_IMPORT_BATCH_SIZE,
          },
          deps: {
            actionsClient,
            rulesClient,
            savedObjectsClient,
            prebuiltRuleAssetClient,
            mlAuthz,
          },
        });

        if (analytics) {
          sendRuleImportTelemetryEvents(
            analytics,
            result.successes.map(({ telemetry }) => telemetry),
            logger
          );
        }

        // Overwritten rules already existed, so only newly created ones fire the trigger.
        const rulesByRuleId = new Map(args.rules.map((rule) => [rule.rule_id, rule]));
        emitRulesCreated(
          result.successes.flatMap(({ rule_id: ruleId, isNew, telemetry }) =>
            isNew
              ? [
                  {
                    id: telemetry.id,
                    type: telemetry.type,
                    tags: rulesByRuleId.get(ruleId)?.tags,
                  },
                ]
              : []
          ),
          'import'
        );

        return result;
      });
    },

    async getHistoryForRule(args: GetHistoryForRuleArgs) {
      return withSecuritySpan('DetectionRulesClient.getHistoryForRule', async () => {
        return getHistoryForRule({ rulesClient, userProfileService: userProfile, logger, ...args });
      });
    },

    async restoreRuleFromHistory({
      ruleId,
      changeId,
      currentRuleRevision,
    }: RestoreRuleFromHistoryArgs): Promise<RestoreRuleFromHistoryResponse> {
      return withSecuritySpan('DetectionRulesClient.restoreRuleFromHistory', async () => {
        try {
          const { restoredRevisionTimestamp, recreated, ...response } =
            await restoreRuleFromHistory({
              actionsClient,
              rulesClient,
              prebuiltRuleAssetClient,
              mlAuthz,
              rulesAuthz,
              ruleId,
              changeId,
              currentRuleRevision,
            });

          if (analytics) {
            sendRuleRestoreTelemetryEvent(
              analytics,
              { rule: response.rule, restoredRevisionTimestamp },
              logger
            );
          }

          // A deleted rule is created again, so it needs the same follow-up as any new rule.
          if (recreated) {
            emitRulesCreated([toCreatedRuleSummary(response.rule)], 'restore');
          }

          return response;
        } catch (err) {
          if (analytics) {
            const status =
              (err as { statusCode?: number }).statusCode === 409 ? 'conflict' : 'error';

            sendRuleRestoreErrorTelemetryEvent(
              analytics,
              { ruleId, changeId, status, errorMessage: (err as Error).message },
              logger
            );
          }

          throw err;
        }
      });
    },
  };
};
