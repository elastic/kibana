/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { isEqual } from 'lodash';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableMessage,
} from '@elastic/eui';
import type { EuiSelectableProps } from '@elastic/eui';
import { ALL_OPTION_KEY, getSelectableOptions } from './get_selectable_options';
import { EMPTY_MESSAGE, SEARCH_PLACEHOLDER } from './translations';

interface FilterSelectProps {
  label: string;
  allLabel?: string;
  options: string[];
  invalidOptions?: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
  getOptionLabel?: (option: string) => string;
  'data-test-subj': string;
}

export function FilterSelect({
  label,
  allLabel,
  options,
  invalidOptions = [],
  selected,
  onChange,
  singleSelection = false,
  isLoading = false,
  errorMessage,
  getOptionLabel = (option) => option,
  'data-test-subj': dataTestSubj,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasError = Boolean(errorMessage);

  const selectableOptions = getSelectableOptions({
    options,
    invalidOptions,
    selected,
    allLabel,
    isLoading,
    hasError,
    getOptionLabel,
  });

  const getNextSelection = (key: string, isChecked: boolean): string[] => {
    if (key === ALL_OPTION_KEY) {
      return [];
    }
    if (singleSelection) {
      return isChecked ? [key] : [];
    }
    const withoutKey = selected.filter((value) => value !== key);
    return isChecked ? [...withoutKey, key] : withoutKey;
  };

  const onSelectionChange: NonNullable<EuiSelectableProps['onChange']> = (
    _options,
    _event,
    changedOption
  ) => {
    const nextSelection = getNextSelection(changedOption.key!, changedOption.checked === 'on');

    if (!isEqual(nextSelection, selected)) {
      onChange(nextSelection);
    }
    if (singleSelection) {
      setIsOpen(false);
    }
  };

  const buttonLabel = singleSelection
    ? (selected[0] && getOptionLabel(selected[0])) || allLabel || label
    : label;

  return (
    <EuiFilterGroup>
      <EuiPopover
        aria-label={label}
        button={
          <EuiFilterButton
            iconType="chevronSingleDown"
            isLoading={isLoading}
            isSelected={isOpen}
            hasActiveFilters={selected.length > 0}
            numFilters={singleSelection || isLoading ? undefined : options.length}
            numActiveFilters={singleSelection ? undefined : selected.length}
            onClick={() => setIsOpen((current) => !current)}
            data-test-subj={dataTestSubj}
          >
            {buttonLabel}
          </EuiFilterButton>
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          searchable
          aria-label={label}
          singleSelection={singleSelection ? 'always' : false}
          isLoading={isLoading}
          options={selectableOptions}
          onChange={onSelectionChange}
          emptyMessage={hasError ? <></> : EMPTY_MESSAGE}
          searchProps={{ placeholder: SEARCH_PLACEHOLDER }}
        >
          {(list, search) => (
            <>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {hasError && (
                <EuiSelectableMessage>
                  <p>{errorMessage}</p>
                </EuiSelectableMessage>
              )}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}
