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
import { FieldUpgradeStateEnum } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import {
  type FieldsDiff,
  type DiffableAllFields,
  type RuleUpgradeInfoForReview,
  ThreeWayDiffConflict,
  type RuleSignatureId,
  NON_UPGRADEABLE_DIFFABLE_FIELDS,
  ThreeWayDiffOutcome,
} from '../../../../../../common/api/detection_engine';
import { assertUnreachable } from '../../../../../../common/utility_types';

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
      const fieldsUpgradeState = calcFieldsState(
        ruleUpgradeInfo.diff.fields,
        rulesResolvedConflicts[ruleUpgradeInfo.rule_id] ?? {}
      );

      const hasRuleTypeChange = Boolean(ruleUpgradeInfo.diff.fields.type);
      const hasFieldConflicts = Object.values(fieldsUpgradeState).some(
        ({ state: fieldState }) =>
          fieldState === FieldUpgradeStateEnum.SolvableConflict ||
          fieldState === FieldUpgradeStateEnum.NonSolvableConflict
      );

      state[ruleUpgradeInfo.rule_id] = {
        ...ruleUpgradeInfo,
        fieldsUpgradeState,
        hasUnresolvedConflicts: isPrebuiltRulesCustomizationEnabled
          ? hasRuleTypeChange || hasFieldConflicts
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

const NON_UPGRADEABLE_DIFFABLE_FIELDS_SET: Readonly<Set<string>> = new Set(
  NON_UPGRADEABLE_DIFFABLE_FIELDS
);

function calcFieldsState(
  fieldsDiff: FieldsDiff<Record<string, unknown>>,
  ruleResolvedConflicts: RuleResolvedConflicts
): FieldsUpgradeState {
  const fieldsState: FieldsUpgradeState = {};

  for (const fieldName of Object.keys(fieldsDiff)) {
    if (NON_UPGRADEABLE_DIFFABLE_FIELDS_SET.has(fieldName)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const fieldDiff = fieldsDiff[fieldName];

    switch (fieldDiff.conflict) {
      case ThreeWayDiffConflict.NONE:
        if (fieldDiff.has_update) {
          fieldsState[fieldName] = {
            state: FieldUpgradeStateEnum.NoConflict,
          };
        } else {
          fieldsState[fieldName] = {
            state:
              fieldDiff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueSameUpdate
                ? FieldUpgradeStateEnum.SameUpdate
                : FieldUpgradeStateEnum.NoUpdate,
          };
        }
        break;

      case ThreeWayDiffConflict.SOLVABLE:
        fieldsState[fieldName] = { state: FieldUpgradeStateEnum.SolvableConflict };
        break;

      case ThreeWayDiffConflict.NON_SOLVABLE:
        fieldsState[fieldName] = { state: FieldUpgradeStateEnum.NonSolvableConflict };
        break;

      default:
        assertUnreachable(fieldDiff.conflict);
    }
  }

  for (const [fieldName, resolvedValue] of Object.entries(ruleResolvedConflicts)) {
    fieldsState[fieldName] = { state: FieldUpgradeStateEnum.Accepted, resolvedValue };
  }

  return fieldsState;
}
