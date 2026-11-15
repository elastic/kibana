/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiFilterButton,
  EuiNotificationBadge,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
  type EuiSelectableOption,
} from '@elastic/eui';
import React, { useState } from 'react';

interface FilterPopoverProps<Value extends string> {
  label: string;
  options: readonly Value[];
  selected: Value[];
  counts: Record<Value, number> | undefined;
  getLabel: (value: Value) => string;
  getPrepend?: (value: Value) => React.ReactNode;
  onChange: (selected: Value[]) => void;
  testSubject: string;
}

export const FilterPopover = <Value extends string>({
  label,
  options,
  selected,
  counts,
  getLabel,
  getPrepend,
  onChange,
  testSubject,
}: FilterPopoverProps<Value>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectableOptions: Array<EuiSelectableOption<{ value: Value }>> = options.map((value) => ({
    key: value,
    value,
    label: getLabel(value),
    checked: selected.includes(value) ? 'on' : undefined,
    prepend: getPrepend?.(value),
    // No counts while facets load or after they fail; a 0 would read as "no matches".
    append: counts ? (
      <EuiNotificationBadge color="subdued" size="s">
        {counts[value]}
      </EuiNotificationBadge>
    ) : undefined,
    'data-test-subj': `${testSubject}Option-${value}`,
  }));

  return (
    <EuiPopover
      aria-label={label}
      button={
        <EuiFilterButton
          data-test-subj={`${testSubject}Button`}
          iconType="chevronSingleDown"
          isSelected={isOpen}
          numFilters={options.length}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          onClick={() => setIsOpen((current) => !current)}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable<{ value: Value }>
        aria-label={label}
        options={selectableOptions}
        onChange={(nextOptions) =>
          onChange(nextOptions.filter(({ checked }) => checked === 'on').map(({ value }) => value))
        }
        listProps={{ isVirtualized: false }}
      >
        {(list) => (
          <div
            css={css`
              min-inline-size: ${euiTheme.base * 15}px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
