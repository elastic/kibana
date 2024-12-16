/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This code is based on MultiSelectFilter component from x-pack/plugins/cases/public/components/all_cases/multi_select_filter.tsx */
import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopoverTitle,
  EuiCallOut,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelectable,
  EuiFilterButton,
  EuiFilterGroup,
  EuiText,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import { i18n } from '@kbn/i18n';

type FilterOption<T extends string, K extends string = string> = EuiSelectableOption<{
  key: K;
  label: T;
}>;

const fromRawOptionsToEuiSelectableOptions = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>,
  selectedOptionKeys: string[]
): Array<FilterOption<T, K>> => {
  return options.map(({ key, label }) => {
    const selectableOption: FilterOption<T, K> = { label, key };
    if (selectedOptionKeys.includes(key)) {
      selectableOption.checked = 'on';
    }
    selectableOption['data-test-subj'] = `options-filter-popover-item-${key.split(' ').join('-')}`;
    return selectableOption;
  });
};

const fromEuiSelectableOptionToRawOption = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>
): string[] => {
  return options.map((option) => option.key);
};

const getEuiSelectableCheckedOptions = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>
) => options.filter((option) => option.checked === 'on') as Array<FilterOption<T, K>>;

interface UseFilterParams<T extends string, K extends string = string> {
  buttonIconType?: string;
  buttonLabel?: string;
  hideActiveOptionsNumber?: boolean;
  id: string;
  limit?: number;
  limitReachedMessage?: string;
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  options: Array<FilterOption<T, K>>;
  renderOption?: (option: FilterOption<T, K>) => React.ReactNode;
  selectedOptionKeys?: string[];
  transparentBackground?: boolean;
}
export const MultiSelectFilter = <T extends string, K extends string = string>({
  buttonLabel,
  buttonIconType,
  hideActiveOptionsNumber,
  id,
  limit,
  limitReachedMessage,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
  transparentBackground,
}: UseFilterParams<T, K>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const showActiveOptionsNumber = !hideActiveOptionsNumber;
  const isInvalid = Boolean(limit && limitReachedMessage && selectedOptionKeys.length >= limit);
  const options = fromRawOptionsToEuiSelectableOptions(rawOptions, selectedOptionKeys);

  useEffect(() => {
    const newSelectedOptions = selectedOptionKeys.filter((selectedOptionKey) =>
      rawOptions.some(({ key: optionKey }) => optionKey === selectedOptionKey)
    );
    if (!isEqual(newSelectedOptions, selectedOptionKeys)) {
      onChange({
        filterId: id,
        selectedOptionKeys: newSelectedOptions,
      });
    }
  }, [selectedOptionKeys, rawOptions, id, onChange]);

  const _onChange = (newOptions: Array<FilterOption<T, K>>) => {
    const newSelectedOptions = getEuiSelectableCheckedOptions(newOptions);
    if (isInvalid && limit && newSelectedOptions.length >= limit) {
      return;
    }

    onChange({
      filterId: id,
      selectedOptionKeys: fromEuiSelectableOptionToRawOption(newSelectedOptions),
    });
  };

  return (
    <EuiFilterGroup
      css={css`
        ${transparentBackground && 'background-color: transparent;'};
      `}
    >
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            css={css`
              max-width: 186px;
            `}
            data-test-subj={`options-filter-popover-button-${id}`}
            iconType={buttonIconType || 'arrowDown'}
            onClick={toggleIsPopoverOpen}
            isSelected={isPopoverOpen}
            numFilters={showActiveOptionsNumber ? options.length : undefined}
            hasActiveFilters={showActiveOptionsNumber ? selectedOptionKeys.length > 0 : undefined}
            numActiveFilters={showActiveOptionsNumber ? selectedOptionKeys.length : undefined}
            aria-label={buttonLabel}
          >
            <EuiText size="s" className="eui-textTruncate">
              {buttonLabel}
            </EuiText>
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        repositionOnScroll
      >
        {isInvalid && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiCallOut
              title={limitReachedMessage}
              color="warning"
              size="s"
              data-test-subj="maximum-length-warning"
            />
            <EuiHorizontalRule margin="none" />
          </>
        )}
        <EuiSelectable<FilterOption<T, K>>
          options={options}
          searchable
          searchProps={{
            placeholder:
              i18n.translate('xpack.csp.common.component.multiSelectFilter.searchWord', {
                defaultMessage: 'Search ',
              }) + buttonLabel,
            compressed: false,
            'data-test-subj': `${id}-search-input`,
            css: css`
              border-radius: 0px !important;
            `,
          }}
          emptyMessage={'empty'}
          onChange={_onChange}
          singleSelection={false}
          renderOption={renderOption}
        >
          {(list, search) => (
            <div
              css={css`
                width: 400px;
              `}
            >
              <EuiPopoverTitle paddingSize="none">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

MultiSelectFilter.displayName = 'MultiSelectFilter';
