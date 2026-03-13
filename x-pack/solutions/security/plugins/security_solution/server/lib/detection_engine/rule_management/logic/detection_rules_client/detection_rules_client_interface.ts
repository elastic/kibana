/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type {
  RuleCreateProps,
  RuleUpdateProps,
  RulePatchProps,
  RuleObjectId,
  RuleResponse,
  RuleToImport,
  RuleSource,
} from '../../../../../../common/api/detection_engine';
import type { IRuleSourceImporter } from '../import/rule_source_importer';
import type { RuleImportErrorObject } from '../import/errors';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type { RuleAlertType } from '../../../rule_schema';

export interface IDetectionRulesClient {
  getRuleCustomizationStatus: () => PrebuiltRulesCustomizationStatus;
  createCustomRule: (args: CreateCustomRuleArgs) => Promise<RuleResponse>;
  createPrebuiltRule: (args: CreatePrebuiltRuleArgs) => Promise<RuleResponse>;
  updateRule: (args: UpdateRuleArgs) => Promise<RuleResponse>;
  patchRule: (args: PatchRuleArgs) => Promise<RuleResponse>;
  deleteRule: (args: DeleteRuleArgs) => Promise<void>;
  bulkDeleteRules: (args: BulkDeleteRulesArgs) => Promise<BulkDeleteRulesReturn>;
  upgradePrebuiltRule: (args: UpgradePrebuiltRuleArgs) => Promise<RuleResponse>;
  revertPrebuiltRule: (args: RevertPrebuiltRuleArgs) => Promise<RuleResponse>;
  importRule: (args: ImportRuleArgs) => Promise<RuleResponse>;
  importRules: (args: ImportRulesArgs) => Promise<Array<RuleResponse | RuleImportErrorObject>>;
}

export interface CreateCustomRuleArgs {
  params: RuleCreateProps;
}

export interface CreatePrebuiltRuleArgs {
  params: RuleCreateProps;
}

export interface UpdateRuleArgs {
  ruleUpdate: RuleUpdateProps;
}

export interface PatchRuleArgs {
  rulePatch: RulePatchProps;
}

export interface DeleteRuleArgs {
  ruleId: RuleObjectId;
}

export interface BulkDeleteRulesArgs {
  ruleIds: RuleObjectId[];
}

export interface BulkDeleteRulesReturn {
  rules: RuleAlertType[];
  errors: BulkOperationError[];
}

export interface UpgradePrebuiltRuleArgs {
  ruleAsset: PrebuiltRuleAsset;
}

export interface RevertPrebuiltRuleArgs {
  ruleAsset: PrebuiltRuleAsset;
  existingRule: RuleResponse;
}

export interface ImportRuleArgs {
  ruleToImport: RuleToImport;
  overrideFields?: { rule_source: RuleSource; immutable: boolean };
  overwriteRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export interface ImportRulesArgs {
  rules: RuleToImport[];
  overwriteRules: boolean;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
}
