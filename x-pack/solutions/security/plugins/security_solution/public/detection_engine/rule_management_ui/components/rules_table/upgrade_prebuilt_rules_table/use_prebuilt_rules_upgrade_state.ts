/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useIsPrebuiltRulesCustomizationEnabled } from '../../../../rule_management/hooks/use_is_prebuilt_rules_customization_enabled';
import type {
  RulesUpgradeState,
  FieldsUpgradeState,
  SetRuleFieldResolvedValueFn,
} from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { FieldUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import {
  type FieldsDiff,
  type DiffableAllFields,
  type DiffableRule,
  type RuleUpgradeInfoForReview,
  ThreeWayDiffConflict,
  type RuleSignatureId,
} from '../../../../../../common/api/detection_engine';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';

type RuleResolvedConflicts = Partial<DiffableAllFields>;
type RulesResolvedConflicts = Record<RuleSignatureId, RuleResolvedConflicts>;

interface UseRulesUpgradeStateResult {
  rulesUpgradeState: RulesUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function usePrebuiltRulesUpgradeState(
  ruleUpgradeInfos: RuleUpgradeInfoForReview[]
): UseRulesUpgradeStateResult {
  const isPrebuiltRulesCustomizationEnabled = useIsPrebuiltRulesCustomizationEnabled();
  const [rulesResolvedConflicts, setRulesResolvedConflicts] = useState<RulesResolvedConflicts>({});

  const setRuleFieldResolvedValue = useCallback(
    (...[params]: Parameters<SetRuleFieldResolvedValueFn>) => {
      setRulesResolvedConflicts((prevRulesResolvedConflicts) => ({
        ...prevRulesResolvedConflicts,
        [params.ruleId]: {
          ...(prevRulesResolvedConflicts[params.ruleId] ?? {}),
          [params.fieldName]: params.resolvedValue,
        },
      }));
    },
    []
  );

  const rulesUpgradeState = useMemo(() => {
    const state: RulesUpgradeState = {};

    for (const ruleUpgradeInfo of ruleUpgradeInfos) {
      state[ruleUpgradeInfo.rule_id] = {
        ...ruleUpgradeInfo,
        finalRule: calcFinalDiffableRule(
          ruleUpgradeInfo,
          rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
        ),
        fieldsUpgradeState: calcFieldsState(
          ruleUpgradeInfo.diff.fields,
          rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
        ),
        hasUnresolvedConflicts: isPrebuiltRulesCustomizationEnabled
          ? getUnacceptedConflictsCount(
              ruleUpgradeInfo.diff.fields,
              rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
            ) > 0
          : false,
      };
    }

    return state;
  }, [ruleUpgradeInfos, rulesResolvedConflicts, isPrebuiltRulesCustomizationEnabled]);

  return {
    rulesUpgradeState,
    setRuleFieldResolvedValue,
  };
}

function calcFinalDiffableRule(
  ruleUpgradeInfo: RuleUpgradeInfoForReview,
  ruleResolvedConflicts: RuleResolvedConflicts
): DiffableRule {
  return {
    ...convertRuleToDiffable(ruleUpgradeInfo.target_rule),
    ...convertRuleFieldsDiffToDiffable(ruleUpgradeInfo.diff.fields),
    ...ruleResolvedConflicts,
  } as DiffableRule;
}

/**
 * Assembles a `DiffableRule` from rule fields diff `merged_version`s.
 */
function convertRuleFieldsDiffToDiffable(
  ruleFieldsDiff: FieldsDiff<Record<string, unknown>>
): Partial<DiffableRule> {
  const mergeVersionRule: Record<string, unknown> = {};

  for (const fieldName of Object.keys(ruleFieldsDiff)) {
    mergeVersionRule[fieldName] = ruleFieldsDiff[fieldName].merged_version;
  }

  return mergeVersionRule;
}

function calcFieldsState(
  ruleFieldsDiff: FieldsDiff<Record<string, unknown>>,
  ruleResolvedConflicts: RuleResolvedConflicts
): FieldsUpgradeState {
  const fieldsState: FieldsUpgradeState = {};

  for (const fieldName of Object.keys(ruleFieldsDiff)) {
    switch (ruleFieldsDiff[fieldName].conflict) {
      case ThreeWayDiffConflict.NONE:
        fieldsState[fieldName] = FieldUpgradeState.Accepted;
        break;

      case ThreeWayDiffConflict.SOLVABLE:
        fieldsState[fieldName] = FieldUpgradeState.SolvableConflict;
        break;

      case ThreeWayDiffConflict.NON_SOLVABLE:
        fieldsState[fieldName] = FieldUpgradeState.NonSolvableConflict;
        break;
    }
  }

  for (const fieldName of Object.keys(ruleResolvedConflicts)) {
    fieldsState[fieldName] = FieldUpgradeState.Accepted;
  }

  return fieldsState;
}

function getUnacceptedConflictsCount(
  ruleFieldsDiff: FieldsDiff<Record<string, unknown>>,
  ruleResolvedConflicts: RuleResolvedConflicts
): number {
  const fieldNames = Object.keys(ruleFieldsDiff);
  const fieldNamesWithConflict = fieldNames.filter(
    (fieldName) => ruleFieldsDiff[fieldName].conflict !== ThreeWayDiffConflict.NONE
  );
  const fieldNamesWithConflictSet = new Set(fieldNamesWithConflict);

  for (const resolvedConflictField of Object.keys(ruleResolvedConflicts)) {
    if (fieldNamesWithConflictSet.has(resolvedConflictField)) {
      fieldNamesWithConflictSet.delete(resolvedConflictField);
    }
  }

  return fieldNamesWithConflictSet.size;
}
