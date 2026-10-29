/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiFilterButton, EuiPopover, EuiSelectable, useGeneratedHtmlId } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';

interface FilterOption {
  value: string;
  label: string;
}

const listCss = css({ inlineSize: 280 });

// Long values, such as environments named after URLs, are truncated; the title has them in full.
const buttonCss = css({ maxInlineSize: '22em' });

/**
 * A filter button of an `EuiFilterGroup` that opens a list to pick one option, and shows the
 * selection while it narrows the list, e.g. "Source: Classic RUM".
 */
export function SingleSelectFilter({
  label,
  options,
  selected,
  isActive,
  onChange,
  searchable = false,
  isLoading = false,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  options: FilterOption[];
  /** The selected option's value. */
  selected: string;
  /** Highlights the button when the selection narrows the list. */
  isActive: boolean;
  onChange: (value: string) => void;
  /** Adds a search box above the options, for long lists. */
  searchable?: boolean;
  isLoading?: boolean;
  /** Names the filter in click telemetry. */
  ebtElement: string;
  'data-test-subj': string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: dataTestSubj });

  const selectedLabel = options.find(({ value }) => value === selected)?.label ?? selected;
  const buttonText = isActive
    ? i18n.translate('xpack.digitalExperience.filter.selected', {
        defaultMessage: '{label}: {value}',
        values: { label, value: selectedLabel },
      })
    : label;

  const selectableOptions: Array<EuiSelectableOption<{ value: string }>> = options.map(
    ({ value, label: optionLabel }) => ({
      key: value,
      value,
      label: optionLabel,
      checked: value === selected ? 'on' : undefined,
      'data-test-subj': `${dataTestSubj}Option-${value}`,
      // Picking an option sets the filter; opening the list doesn't.
      ...getEbtProps({ action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER, element: ebtElement }),
    })
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj={dataTestSubj}
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_FILTER,
            element: ebtElement,
          })}
          css={buttonCss}
          title={buttonText}
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={isActive}
        >
          {buttonText}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<{ value: string }>
        data-test-subj={`${dataTestSubj}List`}
        aria-label={label}
        singleSelection="always"
        searchable={searchable}
        isLoading={isLoading}
        options={selectableOptions}
        onChange={(_options, _event, changed) => {
          onChange(changed.value);
          setIsOpen(false);
        }}
        listProps={{ isVirtualized: false }}
      >
        {(list, search) => (
          <div css={listCss}>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
