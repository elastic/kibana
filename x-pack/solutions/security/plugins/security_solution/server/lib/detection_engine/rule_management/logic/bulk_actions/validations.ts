/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../../../common/api/detection_engine/rule_management';
import {
  BulkActionEditTypeEnum,
  BulkActionsDryRunErrCodeEnum,
} from '../../../../../../common/api/detection_engine/rule_management';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { PrebuiltRulesCustomizationDisabledReason } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { isEsqlRule } from '../../../../../../common/detection_engine/utils';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { invariant } from '../../../../../../common/utils/invariant';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import type { RuleAlertType } from '../../../rule_schema';
import { throwDryRunError } from './dry_run';
import { isIndexPatternsBulkEditAction } from './utils';

interface BulkActionsValidationArgs {
  rule: RuleAlertType;
  mlAuthz: MlAuthz;
}

/**
 * throws ML authorization error wrapped with MACHINE_LEARNING_AUTH error code
 * @param mlAuthz - {@link MlAuthz}
 * @param ruleType - {@link RuleType}
 */
const throwMlAuthError = (mlAuthz: MlAuthz, ruleType: RuleType) =>
  throwDryRunError(
    async () => throwAuthzError(await mlAuthz.validateRuleType(ruleType)),
    BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH
  );

/**
 * runs validation for bulk enable for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkEnableRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk disable for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDisableRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk duplicate for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDuplicateRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk schedule backfill for a single rule
 * @param params - {@link DryRunManualRuleRunBulkActionsValidationArgs}
 */
export const validateBulkScheduleBackfill = async ({ rule }: BulkActionsValidationArgs) => {
  await throwDryRunError(
    () => invariant(rule.enabled, 'Cannot schedule manual rule run for a disabled rule'),
    BulkActionsDryRunErrCodeEnum.MANUAL_RULE_RUN_DISABLED_RULE
  );
};

interface BulkEditBulkActionsValidationArgs {
  ruleType: RuleType;
  mlAuthz: MlAuthz;
  edit: BulkActionEditPayload[];
  immutable: boolean;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

/**
 * runs validation for bulk edit for a single rule
 */
export const validateBulkEditRule = async ({
  ruleType,
  mlAuthz,
  edit,
  immutable,
  ruleCustomizationStatus,
}: BulkEditBulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, ruleType);

  // Prebuilt rule customization checks
  if (immutable) {
    if (ruleCustomizationStatus.isRulesCustomizationEnabled) {
      // Rule customization is enabled; prebuilt rules can be edited
      return undefined;
    }

    // Rule customization is disabled; only certain actions can be applied to immutable rules
    const canRuleBeEdited = istEditApplicableToImmutableRule(edit);
    if (!canRuleBeEdited) {
      await throwDryRunError(
        () => invariant(canRuleBeEdited, "Elastic rule can't be edited"),
        ruleCustomizationStatus.customizationDisabledReason ===
          PrebuiltRulesCustomizationDisabledReason.FeatureFlag
          ? BulkActionsDryRunErrCodeEnum.IMMUTABLE
          : BulkActionsDryRunErrCodeEnum.PREBUILT_CUSTOMIZATION_LICENSE
      );
    }
  }
};

/**
 * add_rule_actions, set_rule_actions can be applied to prebuilt/immutable rules
 */
const istEditApplicableToImmutableRule = (edit: BulkActionEditPayload[]): boolean => {
  const applicableActions: BulkActionEditType[] = [
    BulkActionEditTypeEnum.set_rule_actions,
    BulkActionEditTypeEnum.add_rule_actions,
  ];
  return edit.every(({ type }) => applicableActions.includes(type));
};

interface DryRunBulkEditBulkActionsValidationArgs {
  rule: RuleAlertType;
  mlAuthz: MlAuthz;
  edit: BulkActionEditPayload[];
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

/**
 * executes dry run validations for bulk edit of a single rule
 */
export const dryRunValidateBulkEditRule = async ({
  rule,
  edit,
  mlAuthz,
  ruleCustomizationStatus,
}: DryRunBulkEditBulkActionsValidationArgs) => {
  await validateBulkEditRule({
    ruleType: rule.params.type,
    mlAuthz,
    edit,
    immutable: rule.params.immutable,
    ruleCustomizationStatus,
  });

  // if rule is machine_learning, index pattern action can't be applied to it
  await throwDryRunError(
    () =>
      invariant(
        !isMlRule(rule.params.type) ||
          !edit.some((action) => isIndexPatternsBulkEditAction(action.type)),
        "Machine learning rule doesn't have index patterns"
      ),
    BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_INDEX_PATTERN
  );

  // if rule is es|ql, index pattern action can't be applied to it
  await throwDryRunError(
    () =>
      invariant(
        !isEsqlRule(rule.params.type) ||
          !edit.some((action) => isIndexPatternsBulkEditAction(action.type)),
        "ES|QL rule doesn't have index patterns"
      ),
    BulkActionsDryRunErrCodeEnum.ESQL_INDEX_PATTERN
  );
};
