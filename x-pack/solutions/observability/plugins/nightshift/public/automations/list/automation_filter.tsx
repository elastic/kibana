/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  type EuiSelectableOption,
} from '@elastic/eui';
import { listLabels } from './translations';
import type { FilterOption } from '../utils/filter_automations';

export const AutomationFilter = ({
  label,
  options,
  selected,
  onChange,
  testSubject,
  searchPlaceholder,
  ariaLabel,
  emptyMessage,
  popoverWidth = 240,
}: {
  label: string;
  ariaLabel: string;
  emptyMessage?: string;
  popoverWidth?: number;
  options: Array<FilterOption & { prepend?: React.ReactNode }>;
  selected: string[];
  onChange: (next: string[]) => void;
  testSubject: string;
  searchPlaceholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const selectableOptions: Array<EuiSelectableOption<string>> = options.map(
    ({ label: option, count, prepend }) =>
      ({
        label: option,
        prepend,
        append: (
          <EuiText size="xs" color="subdued">
            {count}
          </EuiText>
        ),
        checked: selected.includes(option) ? 'on' : undefined,
      } as EuiSelectableOption<string>)
  );
  const handleChange = (nextOptions: Array<EuiSelectableOption<string>>) =>
    onChange(
      nextOptions.filter(({ checked }) => checked === 'on').map(({ label: value }) => value)
    );
  const renderContent = (list: React.ReactNode, search?: React.ReactNode) => (
    <div css={{ width: popoverWidth }}>
      {search && <div css={{ padding: euiTheme.size.s }}>{search}</div>}
      {list}
      {selected.length > 0 && (
        <EuiPopoverFooter paddingSize="s">
          <EuiButtonEmpty
            data-test-subj="nightshiftAutomationFilterClearSelection"
            size="xs"
            flush="both"
            onClick={() => onChange([])}
          >
            {listLabels.clearSelection}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      )}
    </div>
  );

  return (
    <EuiPopover
      aria-label={ariaLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length || undefined}
          numFilters={options.length}
          isDisabled={options.length === 0}
          data-test-subj={testSubject}
        >
          {label}
        </EuiFilterButton>
      }
    >
      {searchPlaceholder ? (
        <EuiSelectable
          aria-label={ariaLabel}
          searchable
          searchProps={{ placeholder: searchPlaceholder }}
          emptyMessage={emptyMessage}
          options={selectableOptions}
          onChange={handleChange}
          listProps={{ bordered: false }}
        >
          {(list, search) => renderContent(list, search)}
        </EuiSelectable>
      ) : (
        <EuiSelectable
          aria-label={ariaLabel}
          emptyMessage={emptyMessage}
          options={selectableOptions}
          onChange={handleChange}
          listProps={{ bordered: false }}
        >
          {(list) => renderContent(list)}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
};
