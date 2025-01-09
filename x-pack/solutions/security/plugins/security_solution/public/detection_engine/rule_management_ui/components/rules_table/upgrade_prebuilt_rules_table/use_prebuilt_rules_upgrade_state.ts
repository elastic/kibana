/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
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
import * as i18n from './translations';

type RuleResolvedConflicts = Partial<DiffableAllFields>;
type RulesResolvedConflicts = Record<RuleSignatureId, RuleResolvedConflicts>;

interface RuleConcurrencyControl {
  version: number;
  revision: number;
}

type RulesConcurrencyControl = Record<RuleSignatureId, RuleConcurrencyControl>;

interface UseRulesUpgradeStateResult {
  rulesUpgradeState: RulesUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function usePrebuiltRulesUpgradeState(
  ruleUpgradeInfos: RuleUpgradeInfoForReview[]
): UseRulesUpgradeStateResult {
  const isPrebuiltRulesCustomizationEnabled = useIsPrebuiltRulesCustomizationEnabled();
  const [rulesResolvedValues, setRulesResolvedValues] = useState<RulesResolvedConflicts>({});
  const resetRuleResolvedValues = useCallback(
    (ruleId: RuleSignatureId) => {
      setRulesResolvedValues((prevRulesResolvedConflicts) => ({
        ...prevRulesResolvedConflicts,
        [ruleId]: {},
      }));
    },
    [setRulesResolvedValues]
  );
  const concurrencyControl = useRef<RulesConcurrencyControl>({});
  const { addWarning } = useAppToasts();

  const setRuleFieldResolvedValue = useCallback(
    (...[params]: Parameters<SetRuleFieldResolvedValueFn>) => {
      setRulesResolvedValues((prevRulesResolvedConflicts) => ({
        ...prevRulesResolvedConflicts,
        [params.ruleId]: {
          ...(prevRulesResolvedConflicts[params.ruleId] ?? {}),
          [params.fieldName]: params.resolvedValue,
        },
      }));
    },
    []
  );

  // Implements concurrency control.
  // Rule may be edited or a new prebuilt rules package version gets released.
  // In any case current rule's `revision` or target rule's version
  // will have higher values.
  // Reset resolved conflicts in case of revision`s or version`s mismatch.
  useEffect(() => {
    for (const {
      rule_id: ruleId,
      current_rule: { revision: nextRevision, name },
      target_rule: { version: nextVersion },
    } of ruleUpgradeInfos) {
      const cc = concurrencyControl.current[ruleId];
      const hasNewerRevision = cc ? nextRevision > cc.revision : false;
      const hasNewerVersion = cc ? nextVersion > cc.version : false;
      const hasResolvedValues = Object.keys(rulesResolvedValues[ruleId] ?? {}).length > 0;

      if (hasNewerRevision && hasResolvedValues) {
        addWarning({
          title: i18n.RULE_NEW_REVISION_DETECTED_WARNING,
          text: i18n.RULE_NEW_REVISION_DETECTED_WARNING_DESCRIPTION(name),
        });
      }

      if (hasNewerVersion && hasResolvedValues) {
        addWarning({
          title: i18n.RULE_NEW_VERSION_DETECTED_WARNING,
          text: i18n.RULE_NEW_VERSION_DETECTED_WARNING_DESCRIPTION(name),
        });
      }

      if ((hasNewerRevision || hasNewerVersion) && hasResolvedValues) {
        resetRuleResolvedValues(ruleId);
      }

      concurrencyControl.current[ruleId] = {
        version: nextVersion,
        revision: nextRevision,
      };
    }
  }, [
    ruleUpgradeInfos,
    concurrencyControl,
    rulesResolvedValues,
    setRulesResolvedValues,
    resetRuleResolvedValues,
    addWarning,
  ]);

  const rulesUpgradeState = useMemo(() => {
    const state: RulesUpgradeState = {};

    for (const ruleUpgradeInfo of ruleUpgradeInfos) {
      const fieldsUpgradeState = calcFieldsState(
        ruleUpgradeInfo.diff.fields,
        rulesResolvedValues[ruleUpgradeInfo.rule_id] ?? {}
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
  }, [ruleUpgradeInfos, rulesResolvedValues, isPrebuiltRulesCustomizationEnabled]);

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
