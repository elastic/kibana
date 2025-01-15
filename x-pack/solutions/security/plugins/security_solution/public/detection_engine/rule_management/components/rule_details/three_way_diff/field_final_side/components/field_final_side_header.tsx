/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import { FieldUpgradeSideHeader } from '../../field_upgrade_side_header';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import {
  FieldFinalSideMode,
  useFieldUpgradeContext,
} from '../../rule_upgrade/field_upgrade_context';
import { useFieldEditFormContext } from '../context/field_edit_form_context';
import { FieldFinalSideHelpInfo } from './field_final_side_help_info';
import * as i18n from './translations';

export function FieldFinalSideHeader(): JSX.Element {
  const { fieldName, hasConflict, rightSideMode, finalDiffableRule, setRuleFieldResolvedValue } =
    useFieldUpgradeContext();
  const { form } = useFieldEditFormContext();

  const handleAccept = useCallback(
    () =>
      setRuleFieldResolvedValue({
        ruleId: finalDiffableRule.rule_id,
        fieldName: fieldName as keyof DiffableAllFields,
        resolvedValue: finalDiffableRule[fieldName] as DiffableAllFields[typeof fieldName],
      }),
    [finalDiffableRule, fieldName, setRuleFieldResolvedValue]
  );
  const handleSave = useCallback(() => form?.submit(), [form]);

  switch (rightSideMode) {
    case FieldFinalSideMode.Readonly:
      return (
        <FieldUpgradeSideHeader>
          <StaticHeaderContent>
            {hasConflict && (
              <EuiButton iconType="checkInCircleFilled" size="s" onClick={handleAccept}>
                {i18n.ACCEPT}
              </EuiButton>
            )}
          </StaticHeaderContent>
        </FieldUpgradeSideHeader>
      );
    case FieldFinalSideMode.Edit:
      return (
        <FieldUpgradeSideHeader>
          <StaticHeaderContent>
            <EuiButton
              iconType="checkInCircleFilled"
              size="s"
              disabled={!form?.isValid}
              onClick={handleSave}
            >
              {hasConflict ? i18n.SAVE_AND_ACCEPT : i18n.SAVE}
            </EuiButton>
          </StaticHeaderContent>
        </FieldUpgradeSideHeader>
      );
    default:
      return assertUnreachable(rightSideMode);
  }
}

function StaticHeaderContent({ children }: PropsWithChildren<{}>): JSX.Element {
  return (
    <EuiFlexGroup alignItems="stretch" justifyContent="center">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiTitle size="xxs">
            <h3>
              {i18n.FINAL_UPDATE}
              <FieldFinalSideHelpInfo />
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
