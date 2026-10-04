/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPopoverTitle, EuiSelectable, EuiText, type EuiSelectableOption } from '@elastic/eui';
import { PillPopover } from './pill_popover';

export const SelectPill = <T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  searchPlaceholder,
  testSubject,
  readOnly = false,
}: {
  ariaLabel: string;
  value: T;
  options: Array<{ value: T; label: string; help?: string }>;
  onChange: (value: T) => void;
  searchPlaceholder?: string;
  testSubject: string;
  readOnly?: boolean;
}) =>
  readOnly ? (
    <span>{options.find((option) => option.value === value)?.label ?? value}</span>
  ) : (
    <PillPopover
      ariaLabel={ariaLabel}
      label={options.find((option) => option.value === value)?.label ?? value}
      testSubject={testSubject}
    >
      {(close) => {
        const selectableProps = {
          'aria-label': ariaLabel,
          singleSelection: 'always' as const,
          options: options.map((option) => ({
            key: option.value,
            label: option.label,
            value: option.value,
            checked: option.value === value ? ('on' as const) : undefined,
            ...(option.help && {
              append: (
                <EuiText size="xs" color="subdued">
                  {option.help}
                </EuiText>
              ),
            }),
          })),
          onChange: (
            _options: Array<EuiSelectableOption<{ value: T }>>,
            _event: unknown,
            changed: EuiSelectableOption<{ value: T }>
          ) => {
            onChange(changed.value);
            close();
          },
          listProps: { bordered: false, paddingSize: 's' as const },
        };
        return searchPlaceholder ? (
          <EuiSelectable<{ value: T }>
            {...selectableProps}
            searchable
            searchProps={{ placeholder: searchPlaceholder, compressed: true }}
            height={300}
          >
            {(list, search) => (
              <div css={{ width: 260 }}>
                <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                {list}
              </div>
            )}
          </EuiSelectable>
        ) : (
          <EuiSelectable<{ value: T }> {...selectableProps}>
            {(list) => <div css={{ minWidth: 200 }}>{list}</div>}
          </EuiSelectable>
        );
      }}
    </PillPopover>
  );
