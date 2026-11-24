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
import { useBulkAssignRuleGroupsMutation } from '../api';
import { RuleGroupsMenuButton } from './rule_groups_menu';
import * as i18n from './translations';

/** Rule group actions for the selected rules: the "Rule groups" menu, and "Remove from this group". */
export const RuleGroupsUtilityActions = () => {
  const {
    state: { selectedRuleIds, isAllSelected, rules, filterOptions },
    actions: { clearRulesSelection },
  } = useRulesTableContext();
  const { mutateAsync: bulkAssign, isLoading } = useBulkAssignRuleGroupsMutation();
  const { addSuccess, addError } = useAppToasts();

  // "Select all" can mean thousands of rules that are not loaded; groups work on loaded rules only.
  if (isAllSelected || selectedRuleIds.length === 0) {
    return null;
  }
  const selectedRules = rules.filter((rule) => selectedRuleIds.includes(rule.id));
  const groupId = filterOptions.ruleGroupId;

  return (
    <EuiFlexGroup gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <RuleGroupsMenuButton
          ruleIds={selectedRuleIds}
          ruleRuleIds={selectedRules.map((rule) => rule.rule_id)}
        />
      </EuiFlexItem>
      {groupId && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="minusCircle"
            isLoading={isLoading}
            data-test-subj="ruleGroupsRemoveFromGroup"
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
