/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { isEqual } from 'lodash';
import { useBoolean } from '@kbn/react-hooks';
import { useRulePreviewContext } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/rule_preview_context';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import {
  ThreeWayDiffOutcome,
  type DiffableRule,
  type FieldsDiff,
  type ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';
import { invariant } from '../../../../../../../common/utils/invariant';
import { convertRuleToDiffable } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import type { SetRuleFieldResolvedValueFn } from '../../../../model/prebuilt_rule_upgrade/set_rule_field_resolved_value';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import type { RuleUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeStateEnum } from '../../../../model/prebuilt_rule_upgrade';

export enum FieldFinalSideMode {
  Readonly = 'readonly',
  Edit = 'edit',
}

interface FieldUpgradeContextType {
  /**
   * Field name of an upgradable field from DiffableRule
   */
  fieldName: UpgradeableDiffableFields;
  /**
   * Field's upgrade state
   */
  fieldUpgradeState: FieldUpgradeStateEnum;
  /**
   * Whether the field has an unresolved conflict. This state is derived from `fieldUpgradeState`.
   */
  hasConflict: boolean;
  /**
   * Whether field value is different from Elastic's suggestion.
   * It's true only if user has made changes to the suggested field value.
   */
  hasResolvedValueDifferentFromSuggested: boolean;
  /**
   * Whether the field was changed after prebuilt rule installation, i.e. customized
   * It's true only if user has made changes to the suggested field value.
   */
  isCustomized: boolean;
  /**
   * Field's three way diff
   */
  fieldDiff: ThreeWayDiff<unknown>;
  /**
   * Current final diffable rule including resolved values
   */
  finalDiffableRule: DiffableRule;
  /**
   * Field final side view mode `Readonly` or `Editing`
   */
  rightSideMode: FieldFinalSideMode;
  /**
   * Sets field's resolved value
   */
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  /**
   * Sets field's right side `readonly` mode
   */
  setReadOnlyMode: () => void;
  /**
   * Sets field's right side `edit` mode
   */
  setEditMode: () => void;
}

const FieldUpgradeContext = createContext<FieldUpgradeContextType | null>(null);

interface FieldUpgradeContextProviderProps {
  ruleUpgradeState: RuleUpgradeState;
  fieldName: UpgradeableDiffableFields;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  children: React.ReactNode;
}

export function FieldUpgradeContextProvider({
  ruleUpgradeState,
  fieldName,
  setRuleFieldResolvedValue,
  children,
}: FieldUpgradeContextProviderProps) {
  const { state: fieldUpgradeState } = ruleUpgradeState.fieldsUpgradeState[fieldName];
  const fieldDiff = ruleUpgradeState.diff.fields[fieldName];
  const initialRightSideMode =
    fieldUpgradeState === FieldUpgradeStateEnum.NonSolvableConflict
      ? FieldFinalSideMode.Edit
      : FieldFinalSideMode.Readonly;

  const [editing, { on: setEditMode, off: setReadOnlyMode }] = useBoolean(
    initialRightSideMode === FieldFinalSideMode.Edit
  );

  const { setFieldEditing, setFieldReadonly } = useRulePreviewContext();

  useEffect(() => {
    if (editing) {
      setFieldEditing(fieldName);
    } else {
      setFieldReadonly(fieldName);
    }
  }, [setFieldEditing, setFieldReadonly, editing, fieldName]);

  invariant(fieldDiff, `Field diff is not found for ${fieldName}.`);

  const finalDiffableRule = calcFinalDiffableRule(ruleUpgradeState);

  const contextValue: FieldUpgradeContextType = useMemo(
    () => ({
      fieldName,
      fieldUpgradeState,
      hasConflict:
        fieldUpgradeState === FieldUpgradeStateEnum.SolvableConflict ||
        fieldUpgradeState === FieldUpgradeStateEnum.NonSolvableConflict,
      /*
        Initially, we prefill the resolved value with the merged version.
        If the current resolved value differs from the merged version, it indicates that the user has modified the suggestion.
      */
      hasResolvedValueDifferentFromSuggested: !isEqual(
        fieldDiff.merged_version,
        finalDiffableRule[fieldName]
      ),
      isCustomized: calcIsCustomized(fieldDiff),
      fieldDiff,
      finalDiffableRule,
      rightSideMode: editing ? FieldFinalSideMode.Edit : FieldFinalSideMode.Readonly,
      setRuleFieldResolvedValue,
      setReadOnlyMode,
      setEditMode,
    }),
    [
      fieldName,
      fieldUpgradeState,
      fieldDiff,
      finalDiffableRule,
      editing,
      setRuleFieldResolvedValue,
      setReadOnlyMode,
      setEditMode,
    ]
  );

  return (
    <FieldUpgradeContext.Provider value={contextValue}>{children}</FieldUpgradeContext.Provider>
  );
}

export function useFieldUpgradeContext() {
  const context = useContext(FieldUpgradeContext);

  invariant(
    context !== null,
    'useFieldUpgradeContext must be used inside a FieldUpgradeContextProvider'
  );

  return context;
}

function calcIsCustomized(fieldDiff: ThreeWayDiff<unknown>): boolean {
  switch (fieldDiff.diff_outcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.StockValueCanUpdate:
    case ThreeWayDiffOutcome.MissingBaseCanUpdate:
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
      return false;

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
      return true;

    default:
      return assertUnreachable(fieldDiff.diff_outcome);
  }
}

function calcFinalDiffableRule(ruleUpgradeState: RuleUpgradeState): DiffableRule {
  const fieldsResolvedValues = Object.entries(ruleUpgradeState.fieldsUpgradeState).reduce<
    Record<string, unknown>
  >((result, [fieldName, fieldState]) => {
    if (fieldState.state === FieldUpgradeStateEnum.Accepted) {
      result[fieldName] = fieldState.resolvedValue;
    }

    return result;
  }, {});

  return {
    ...convertRuleToDiffable(ruleUpgradeState.target_rule),
    ...convertRuleFieldsDiffToDiffable(ruleUpgradeState.diff.fields),
    ...fieldsResolvedValues,
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
