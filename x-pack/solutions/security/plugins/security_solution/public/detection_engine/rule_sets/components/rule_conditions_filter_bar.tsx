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
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type {
  RuleSetConditions,
  RuleSetRuleType,
} from '../../../../common/api/detection_engine/rule_sets';
import type { Severity } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  DEFAULT_INTEGRATIONS_MATCH,
  DEFAULT_TAGS_MATCH,
} from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import * as i18n from './translations';

interface Option {
  value: string;
  label: string;
}

interface IncludeExclude<T extends string> {
  include?: T[];
  exclude?: T[];
}

/**
 * Same look as the filters of the rules table: a filter button with a searchable list. A click
 * includes a value, a second click excludes it, a third click clears it.
 */
const IncludeExcludeFilter = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value?: IncludeExclude<T>;
  onChange: (next: { include: T[]; exclude: T[] }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const include = value?.include ?? [];
  const exclude = value?.exclude ?? [];
  const selectable: EuiSelectableOption[] = options.map((option) => ({
    key: option.value,
    label: option.label,
    checked: include.includes(option.value)
      ? 'on'
      : exclude.includes(option.value)
      ? 'off'
      : undefined,
  }));
  const active = include.length + exclude.length;
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
          hasActiveFilters={active > 0}
          numActiveFilters={active || undefined}
          numFilters={options.length}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        allowExclusions
        searchable={options.length > 8}
        options={selectable}
        onChange={(next) =>
          onChange({
            include: next.filter((o) => o.checked === 'on').map((o) => o.key as T),
            exclude: next.filter((o) => o.checked === 'off').map((o) => o.key as T),
          })
        }
        listProps={{ css: { width: 320 } }}
      >
        {(list, search) => (
          <>
            {search && <div css={{ padding: 8 }}>{search}</div>}
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiText size="xs" color="subdued">
                {i18n.EXCLUDE_HINT}
              </EuiText>
            </EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const toOptions = <T extends string>(labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value: value as T, label }));

/**
 * Set conditions with the same controls as the rules table filters: search, tags, Elastic/custom,
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
}) => {
  const source = conditions.rule_source?.include[0];
  const toggleSource = (next: 'external' | 'internal') =>
    onChange('rule_source', source === next ? undefined : { include: [next] });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          compressed
          placeholder={i18n.SEARCH_PLACEHOLDER}
          value={conditions.search?.term ?? ''}
          onChange={(e) =>
            onChange(
              'search',
              e.target.value ? { term: e.target.value, mode: 'legacy' } : undefined
            )
          }
          data-test-subj="ruleSetEditorSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <IncludeExcludeFilter
                label={i18n.TAGS}
                options={tags.map((tag) => ({ value: tag, label: tag }))}
                value={conditions.tags}
                onChange={(next) =>
                  onChange('tags', { ...next, match: conditions.tags?.match ?? DEFAULT_TAGS_MATCH })
                }
              />
              <IncludeExcludeFilter
                label={i18n.INTEGRATIONS}
                options={integrations}
                value={conditions.related_integrations}
                onChange={(next) =>
                  onChange('related_integrations', {
                    ...next,
                    match: conditions.related_integrations?.match ?? DEFAULT_INTEGRATIONS_MATCH,
                  })
                }
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <IncludeExcludeFilter
                label={i18n.RULE_TYPES}
                options={toOptions<RuleSetRuleType>(i18n.RULE_TYPE_LABELS)}
                value={conditions.type}
                onChange={(next) => onChange('type', next)}
              />
              <IncludeExcludeFilter
                label={i18n.SEVERITY}
                options={toOptions<Severity>(i18n.SEVERITY_LABELS)}
                value={conditions.severity}
                onChange={(next) => onChange('severity', next)}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <EuiFilterButton
                isToggle
                withNext
                isSelected={source === 'external'}
                hasActiveFilters={source === 'external'}
                onClick={() => toggleSource('external')}
              >
                {i18n.SOURCE_ELASTIC}
              </EuiFilterButton>
              <EuiFilterButton
                isToggle
                isSelected={source === 'internal'}
                hasActiveFilters={source === 'internal'}
                onClick={() => toggleSource('internal')}
              >
                {i18n.SOURCE_CUSTOM}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
