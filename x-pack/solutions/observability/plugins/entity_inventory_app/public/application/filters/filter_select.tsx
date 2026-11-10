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
import { getEbtProps } from '@kbn/ebt-click';
import type { EbtClickAttrsWithoutAction } from '@kbn/ebt-click';
import { ENTITY_INVENTORY_EBT_ACTIONS } from '../../ebt_constants';
import type { FilterOption } from './get_filter_controls';
import { ALL_OPTION_KEY, getOptionLabel, getSelectableOptions } from './get_selectable_options';
import { EMPTY_MESSAGE, SEARCH_PLACEHOLDER } from './translations';

const NO_EMPTY_MESSAGE = <></>;

interface FilterSelectProps {
  label: string;
  allLabel?: string;
  options: FilterOption[];
  invalidOptions?: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  errorMessage?: string;
  ebt: EbtClickAttrsWithoutAction;
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
  isDisabled = false,
  errorMessage,
  ebt,
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
    const { key, checked } = changedOption;
    if (!key) {
      return;
    }

    const nextSelection = getNextSelection(key, checked === 'on');

    if (!isEqual(nextSelection, selected)) {
      onChange(nextSelection);
    }
    if (singleSelection) {
      setIsOpen(false);
    }
  };

  const selectedLabel = selected[0] && getOptionLabel(options, selected[0]);
  const buttonLabel = singleSelection ? selectedLabel || allLabel || label : label;
  const isMultiSelect = !singleSelection;

  return (
    <EuiFilterGroup compressed>
      <EuiPopover
        aria-label={label}
        button={
          <EuiFilterButton
            iconType="chevronSingleDown"
            isLoading={isLoading}
            isDisabled={isDisabled}
            isSelected={isOpen}
            hasActiveFilters={selected.length > 0}
            numFilters={isMultiSelect && !isLoading ? options.length : undefined}
            numActiveFilters={isMultiSelect ? selected.length : undefined}
            onClick={() => setIsOpen((current) => !current)}
            data-test-subj={dataTestSubj}
            {...getEbtProps({ action: ENTITY_INVENTORY_EBT_ACTIONS.OPEN_FILTER, ...ebt })}
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
          emptyMessage={hasError ? NO_EMPTY_MESSAGE : EMPTY_MESSAGE}
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
