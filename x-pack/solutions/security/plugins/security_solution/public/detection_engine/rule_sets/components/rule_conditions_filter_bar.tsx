/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { TagsFilterPopover } from '../../rule_management_ui/components/rules_table/rules_table_filters/tags_filter_popover';
import * as i18n from './translations';

interface Option {
  value: string;
  label: string;
}

/** Same look as the filters of the rules table: a filter button with a searchable list. */
const MultiSelectFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectable: EuiSelectableOption[] = options.map((option) => ({
    key: option.value,
    label: option.label,
    checked: selected.includes(option.value) ? 'on' : undefined,
  }));
  return (
    <EuiPopover
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length || undefined}
          numFilters={options.length}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        searchable={options.length > 8}
        options={selectable}
        onChange={(next) =>
          onChange(
            next.filter((option) => option.checked === 'on').map((option) => option.key as string)
          )
        }
        listProps={{ css: { width: 300 } }}
      >
        {(list, search) => (
          <>
            {search && <div css={{ padding: 8 }}>{search}</div>}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

/**
 * Group conditions with the same controls as the rules table filters: search, tags, Elastic/custom,
 * plus the fields the table does not filter by (integration, rule type, severity).
 */
export const RuleConditionsFilterBar = ({
  conditions,
  onChange,
  tags,
  integrations,
}: {
  conditions: RuleSetConditions;
  onChange: <K extends keyof RuleSetConditions>(key: K, value: RuleSetConditions[K]) => void;
  tags: string[];
  integrations: Option[];
}) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    <EuiFlexItem>
      <EuiFieldSearch
        fullWidth
        compressed
        placeholder={i18n.SEARCH_PLACEHOLDER}
        value={conditions.search ?? ''}
        onChange={(e) => onChange('search', e.target.value || undefined)}
        data-test-subj="ruleSetEditorSearch"
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <TagsFilterPopover
              tags={tags}
              selectedTags={conditions.tags ?? []}
              onSelectedTagsChanged={(next) => onChange('tags', next.length ? next : undefined)}
            />
            <MultiSelectFilter
              label={i18n.INTEGRATIONS}
              options={integrations}
              selected={conditions.integrations ?? []}
              onChange={(next) => onChange('integrations', next.length ? next : undefined)}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <MultiSelectFilter
              label={i18n.RULE_TYPES}
              options={Object.entries(i18n.RULE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              selected={conditions.rule_types ?? []}
              onChange={(next) => onChange('rule_types', next.length ? next : undefined)}
            />
            <MultiSelectFilter
              label={i18n.SEVERITY}
              options={Object.entries(i18n.SEVERITY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              selected={conditions.severities ?? []}
              onChange={(next) => onChange('severities', next.length ? next : undefined)}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton
              isToggle
              withNext
              isSelected={conditions.source === 'elastic'}
              hasActiveFilters={conditions.source === 'elastic'}
              onClick={() =>
                onChange('source', conditions.source === 'elastic' ? undefined : 'elastic')
              }
            >
              {i18n.SOURCE_ELASTIC}
            </EuiFilterButton>
            <EuiFilterButton
              isToggle
              isSelected={conditions.source === 'custom'}
              hasActiveFilters={conditions.source === 'custom'}
              onClick={() =>
                onChange('source', conditions.source === 'custom' ? undefined : 'custom')
              }
            >
              {i18n.SOURCE_CUSTOM}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
