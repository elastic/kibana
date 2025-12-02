/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { FilteringRule } from '@kbn/search-connectors';
import {
  filteringPolicyToText,
  filteringRuleToText,
  FilteringRuleRuleValues,
} from '@kbn/search-connectors';

import { docLinks } from '../../../../../shared/doc_links';

import { InlineEditableTable } from '../../../../../shared/tables/inline_editable_table/inline_editable_table';
import type { InlineEditableTableProps } from '../../../../../shared/tables/inline_editable_table/inline_editable_table_logic';
import { InlineEditableTableLogic } from '../../../../../shared/tables/inline_editable_table/inline_editable_table_logic';
import type {
  FormErrors,
  InlineEditableTableColumn,
} from '../../../../../shared/tables/inline_editable_table/types';
import type { ItemWithAnID } from '../../../../../shared/tables/types';

import { IndexViewLogic } from '../../index_view_logic';
import {
  BASIC_TABLE_FIELD_TITLE,
  BASIC_TABLE_POLICY_TITLE,
  BASIC_TABLE_RULE_TITLE,
  BASIC_TABLE_VALUE_TITLE,
  getSyncRulesDescription,
  SYNC_RULES_LEARN_MORE_LINK,
  SYNC_RULES_TABLE_ADD_RULE_LABEL,
  SYNC_RULES_TABLE_ARIA_LABEL,
  REGEX_ERROR,
  INCLUDE_EVERYTHING_ELSE_MESSAGE,
} from '../../translations';

import { ConnectorFilteringLogic } from './connector_filtering_logic';

const instanceId = 'FilteringRulesTable';

function validateItem(filteringRule: FilteringRule): FormErrors {
  if (filteringRule.rule === 'regex') {
    try {
      new RegExp(filteringRule.value);
      return {};
    } catch {
      return {
        value: REGEX_ERROR,
      };
    }
  }
  return {};
}

export const SyncRulesTable: React.FC = () => {
  const { editableFilteringRules } = useValues(ConnectorFilteringLogic);
  const { indexName } = useValues(IndexViewLogic);
  const { addFilteringRule, deleteFilteringRule, reorderFilteringRules, updateFilteringRule } =
    useActions(ConnectorFilteringLogic);

  const description = (
    <EuiText size="s" color="default">
      {getSyncRulesDescription(indexName)}
      <EuiSpacer />
      <EuiLink href={docLinks.syncRules} external target="_blank">
        {SYNC_RULES_LEARN_MORE_LINK}
      </EuiLink>
    </EuiText>
  );

  const columns: Array<InlineEditableTableColumn<FilteringRule>> = [
    {
      editingRender: (filteringRule, onChange) => (
        <EuiSelect
          autoFocus
          fullWidth
          value={filteringRule.policy}
          onChange={(e) => onChange(e.target.value)}
          options={[
            {
              text: filteringPolicyToText('include'),
              value: 'include',
            },
            {
              text: filteringPolicyToText('exclude'),
              value: 'exclude',
            },
          ]}
          aria-label={BASIC_TABLE_POLICY_TITLE}
        />
      ),
      field: 'policy',
      name: BASIC_TABLE_POLICY_TITLE,
      render: (indexingRule) => (
        <EuiText size="s">{filteringPolicyToText(indexingRule.policy)}</EuiText>
      ),
    },
    {
      editingRender: (rule, onChange) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={rule.field}
              onChange={(e) => onChange(e.target.value)}
              aria-label={BASIC_TABLE_FIELD_TITLE}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      field: 'field',
      name: BASIC_TABLE_FIELD_TITLE,
      render: (rule) => (
        <EuiText size="s">
          <EuiCode>{rule.field}</EuiCode>
        </EuiText>
      ),
    },
    {
      editingRender: (filteringRule, onChange) => (
        <EuiSelect
          fullWidth
          value={filteringRule.rule}
          onChange={(e) => onChange(e.target.value)}
          options={Object.values(FilteringRuleRuleValues).map((rule) => ({
            text: filteringRuleToText(rule),
            value: rule,
          }))}
          aria-label={BASIC_TABLE_RULE_TITLE}
        />
      ),
      field: 'rule',
      name: BASIC_TABLE_RULE_TITLE,
      render: (rule) => <EuiText size="s">{filteringRuleToText(rule.rule)}</EuiText>,
    },
    {
      editingRender: (rule, onChange) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={rule.value}
              onChange={(e) => onChange(e.target.value)}
              aria-label={BASIC_TABLE_VALUE_TITLE}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      field: 'value',
      name: BASIC_TABLE_VALUE_TITLE,
      render: (rule) => (
        <EuiText size="s">
          <EuiCode>{rule.value}</EuiCode>
        </EuiText>
      ),
    },
  ];

  return (
    <InlineEditableTable
      addButtonText={SYNC_RULES_TABLE_ADD_RULE_LABEL}
      ariaLabel={SYNC_RULES_TABLE_ARIA_LABEL}
      columns={columns}
      defaultItem={{
        policy: 'include',
        rule: 'equals',
        value: '',
      }}
      description={description}
      instanceId={instanceId}
      items={editableFilteringRules}
      onAdd={(rule) => {
        const now = new Date().toISOString();

        const newRule = {
          ...rule,
          created_at: now,
          // crypto.randomUUID isn't widely enough available in browsers yet
          id: uuidv4(),
          updated_at: now,
        };
        addFilteringRule(newRule);
        InlineEditableTableLogic({
          instanceId,
        } as InlineEditableTableProps<ItemWithAnID>).actions.doneEditing();
      }}
      onDelete={deleteFilteringRule}
      onUpdate={(rule) => {
        updateFilteringRule(rule);
        InlineEditableTableLogic({
          instanceId,
        } as InlineEditableTableProps<ItemWithAnID>).actions.doneEditing();
      }}
      onReorder={reorderFilteringRules}
      title=""
      validateItem={validateItem}
      bottomRows={[<EuiText size="s">{INCLUDE_EVERYTHING_ELSE_MESSAGE}</EuiText>]}
      canRemoveLastItem
      emptyPropertyAllowed
      showRowIndex
    />
  );
};
