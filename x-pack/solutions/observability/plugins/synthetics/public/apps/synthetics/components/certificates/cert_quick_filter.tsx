/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiIconTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiToolTip,
  type EuiSelectableOption,
} from '@elastic/eui';

export interface QuickFilterOption {
  value: string;
  label: string;
  tooltip?: string;
}

interface Props {
  label: string;
  options: QuickFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  dataTestSubj?: string;
  isDisabled?: boolean;
  disabledTooltip?: string;
  searchable?: boolean;
}

export const CertQuickFilter: React.FC<Props> = ({
  label,
  options,
  selectedValues,
  onChange,
  dataTestSubj,
  isDisabled = false,
  disabledTooltip,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = options.map(
    ({ value, label: optionLabel, tooltip }) => ({
      label: optionLabel,
      key: value,
      checked: selectedValues.includes(value) ? 'on' : undefined,
      'data-test-subj': `${dataTestSubj ?? 'certQuickFilter'}Option-${value}`,
      ...(tooltip
        ? {
            append: (
              <EuiIconTip
                type="question"
                color="subdued"
                content={tooltip}
                data-test-subj={`${dataTestSubj ?? 'certQuickFilter'}OptionTip-${value}`}
              />
            ),
          }
        : {}),
    })
  );

  const button = (
    <EuiFilterButton
      data-test-subj={dataTestSubj ?? 'certQuickFilterButton'}
      iconType="arrowDown"
      onClick={() => setIsOpen(!isOpen)}
      isSelected={isOpen}
      isDisabled={isDisabled}
      numFilters={options.length}
      hasActiveFilters={selectedValues.length > 0}
      numActiveFilters={selectedValues.length}
    >
      {label}
    </EuiFilterButton>
  );

  if (isDisabled) {
    return (
      <EuiFilterGroup>
        {disabledTooltip ? <EuiToolTip content={disabledTooltip}>{button}</EuiToolTip> : button}
      </EuiFilterGroup>
    );
  }

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downCenter"
      >
        <EuiSelectable
          aria-label={label}
          options={selectableOptions}
          searchable={searchable}
          onChange={(newOptions) => {
            onChange(
              newOptions
                .filter((option) => option.checked === 'on')
                .map((option) => option.key as string)
            );
          }}
        >
          {(list, search) => (
            <div
              css={css`
                width: 260px;
              `}
            >
              <EuiPopoverTitle paddingSize="s">{label}</EuiPopoverTitle>
              {search}
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
