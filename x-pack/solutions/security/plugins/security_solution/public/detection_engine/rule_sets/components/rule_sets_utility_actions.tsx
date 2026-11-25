/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkAssignRuleSetsMutation } from '../api';
import { RuleSetsMenuButton } from './rule_sets_menu';
import * as i18n from './translations';

/** Rule set actions for the selected rules: the "Rule sets" menu, and "Remove from this group". */
export const RuleSetsUtilityActions = () => {
  const {
    state: { selectedRuleIds, isAllSelected, rules, filterOptions },
    actions: { clearRulesSelection },
  } = useRulesTableContext();
  const { mutateAsync: bulkAssign, isLoading } = useBulkAssignRuleSetsMutation();
  const { addSuccess, addError } = useAppToasts();

  // "Select all" can mean thousands of rules that are not loaded; groups work on loaded rules only.
  if (isAllSelected || selectedRuleIds.length === 0) {
    return null;
  }
  const selectedRules = rules.filter((rule) => selectedRuleIds.includes(rule.id));
  const groupId = filterOptions.ruleSetId;

  return (
    <EuiFlexGroup gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <RuleSetsMenuButton
          ruleIds={selectedRuleIds}
          ruleRuleIds={selectedRules.map((rule) => rule.rule_id)}
        />
      </EuiFlexItem>
      {groupId && filterOptions.members === 'left_out' && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="plusCircle"
            isLoading={isLoading}
            data-test-subj="ruleSetsPutBack"
            onClick={async () => {
              try {
                await bulkAssign({ ids: selectedRuleIds, add_to: [groupId] });
                addSuccess(i18n.MENU_APPLIED_TOAST);
                clearRulesSelection();
              } catch (error) {
                addError(error, { title: i18n.SAVE_ERROR });
              }
            }}
          >
            {i18n.PUT_BACK}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {groupId && filterOptions.members !== 'left_out' && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="minusCircle"
            isLoading={isLoading}
            data-test-subj="ruleSetsRemoveFromGroup"
            onClick={async () => {
              try {
                await bulkAssign({ ids: selectedRuleIds, remove_from: [groupId] });
                addSuccess(i18n.MENU_APPLIED_TOAST);
                clearRulesSelection();
              } catch (error) {
                addError(error, { title: i18n.SAVE_ERROR });
              }
            }}
          >
            {i18n.REMOVE_FROM_GROUP}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
