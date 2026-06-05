/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { SecurityRuleChangeTracking } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type {
  RuleCreateProps,
  RuleUpdateProps,
  RulePatchProps,
  RuleObjectId,
  RuleResponse,
  RuleToImport,
  PrebuiltRulesFilter,
} from '../../../../../../common/api/detection_engine';
import type {
  InstalledRuleBasicInfo,
  SkippedRuleInstall,
  SkippedRuleUpgrade,
  UpgradedRuleBasicInfo,
  RuleUpgradeSpecifier,
  PickVersionValues,
  UpgradeConflictResolutionStrategy,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { RuleChangesHistoryResponse } from '../../../../../../common/api/detection_engine/rule_management';
import type { IRuleSourceImporter } from '../import/rule_source_importer';
import type { RuleImportErrorObject } from '../import/errors';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type { RuleAlertType } from '../../../rule_schema';
import type { PromisePoolError, PromisePoolResult } from '../../../../../utils/promise_pool';
import type { RuleTriad } from '../../../prebuilt_rules/model/rule_groups/get_rule_groups';
import type { RuleUpgradeContext } from '../../../prebuilt_rules/api/perform_rule_upgrade/update_rule_telemetry';
import type { RuleVersionSpecifier } from '../../../prebuilt_rules/logic/rule_versions/rule_version_specifier';

export interface IDetectionRulesClient {
  getRuleCustomizationStatus: () => PrebuiltRulesCustomizationStatus;
  createCustomRule: (args: CreateCustomRuleArgs) => Promise<RuleResponse>;
  updateRule: (args: UpdateRuleArgs) => Promise<RuleResponse>;
  patchRule: (args: PatchRuleArgs) => Promise<RuleResponse>;
  deleteRule: (args: DeleteRuleArgs) => Promise<void>;
  bulkDeleteRules: (args: BulkDeleteRulesArgs) => Promise<BulkDeleteRulesReturn>;
  importRules: (args: ImportRulesArgs) => Promise<Array<RuleResponse | RuleImportErrorObject>>;
  installPrebuiltRules: (args: InstallPrebuiltRulesArgs) => Promise<InstallPrebuiltRulesResult>;
  installAllPrebuiltRules: () => Promise<InstallPrebuiltRulesResult>;
  upgradePrebuiltRules: (args: UpgradePrebuiltRulesArgs) => Promise<UpgradePrebuiltRulesResult>;
  upgradeAllPrebuiltRules: (
    args: UpgradeAllPrebuiltRulesArgs
  ) => Promise<UpgradePrebuiltRulesResult>;
  revertPrebuiltRules: (args: RevertPrebuiltRulesArgs) => Promise<RevertPrebuiltRulesResult>;
  getHistoryForRule: (args: GetHistoryForRuleArgs) => Promise<RuleChangesHistoryResponse>;
}

export interface CreateCustomRuleArgs {
  params: RuleCreateProps;
  changeTracking?: SecurityRuleChangeTracking;
}

export interface UpdateRuleArgs {
  ruleUpdate: RuleUpdateProps;
  changeTracking?: SecurityRuleChangeTracking;
}

export interface PatchRuleArgs {
  rulePatch: RulePatchProps;
  changeTracking?: SecurityRuleChangeTracking;
}

export interface DeleteRuleArgs {
  ruleId: RuleObjectId;
}

export interface BulkDeleteRulesArgs {
  ruleIds: RuleObjectId[];
  changeTracking?: SecurityRuleChangeTracking<never>;
}

export interface BulkDeleteRulesReturn {
  rules: RuleAlertType[];
  errors: BulkOperationError[];
}

export interface ImportRulesArgs {
  rules: RuleToImport[];
  overwriteRules: boolean;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
  changeTracking?: SecurityRuleChangeTracking<never>;
}

export interface GetHistoryForRuleArgs {
  ruleId: RuleObjectId;
  page?: number;
  perPage?: number;
}

export interface InstallPrebuiltRulesArgs {
  ruleSpecifiers: Array<RuleVersionSpecifier>;
}

export interface InstallPrebuiltRulesResult {
  installedRules: InstalledRuleBasicInfo[];
  skippedRules: SkippedRuleInstall[];
  errors: Array<PromisePoolError<{ rule_id: string }>>;
}

export interface UpgradePrebuiltRulesArgs {
  ruleSpecifiers: RuleUpgradeSpecifier[];
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  defaultPickVersion: PickVersionValues;
  isDryRun: boolean;
}

export interface UpgradeAllPrebuiltRulesArgs {
  filter?: PrebuiltRulesFilter;
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  defaultPickVersion: PickVersionValues;
  isDryRun: boolean;
}

export interface UpgradePrebuiltRulesResult {
  updatedRules: UpgradedRuleBasicInfo[];
  skippedRules: SkippedRuleUpgrade[];
  errors: Array<PromisePoolError<{ rule_id: string }>>;
  ruleUpgradeContexts: Map<string, RuleUpgradeContext>;
}

export interface RevertPrebuiltRulesArgs {
  rules: RuleTriad[];
}

export interface RevertPrebuiltRulesResult {
  results: Array<PromisePoolResult<RuleTriad, RuleResponse>>;
  errors: Array<PromisePoolError<RuleTriad>>;
}
