/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { noop } from 'lodash';
import type { EuiSelectableProps, FilterChecked } from '@elastic/eui';
import {
  EuiPopover,
  EuiPopoverFooter,
  EuiFilterButton,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { useBoolState } from '../../hooks/use_bool_state';

export interface MultiselectFilterProps<T = unknown> {
  ['data-test-subj']?: string;
  title: string;
  items: T[];
  selectedItems: T[];
  onSelectionChange?: (selectedItems: T[], changedOption: T, changedStatus: FilterChecked) => void;
  renderItem?: (item: T) => React.ReactChild;
  renderLabel?: (item: T) => string;
  /**
   * Width of the popover content. If undefined, the popover will take the width of the button.
   *  https://eui.elastic.co/#/forms/selectable#sizing-and-containers
   */
  width?: number;
  /** When inside a `fullWidth` EuiFilterGroup, set true so the button fills available space. */
  grow?: boolean;
  /**
   * Optional action below the selectable list (EUI Selectable + popover footer).
   * Pass a render callback to close the popover before opening a flyout.
   */
  footer?: React.ReactNode | ((closePopover: () => void) => React.ReactNode);
}

interface MultiselectFilterOption<T> {
  originalItem: T;
  label: string;
  checked?: FilterChecked;
}

/**
 * Please use this component instead of [MultiselectFilter](../../../detection_engine/rule_monitoring/components/basic/filters/multiselect_filter/index.tsx)
 *
 * The new version uses `EuiSelectable` instead of the deprecated `EuiFilterSelectItem`. That required a width param, which wasn't previously necessary.
 * It also exports the filter without the `EuiFilterGroup` wrapper, allowing several filters to be grouped.
 *
 * To migrate to the new version, you need to:
 * 1. Wrap it with EuiFilterGroup
 * @example
 * <EuiFilterGroup>
 *   <MultiselectFilter>
 * </EuiFilterGroup>`
 *
 * 2. Provide the desired width
 * @example
 * <MultiselectFilter<MyType> width={150} />
 */
const MultiselectFilterComponent = <T extends unknown>({
  'data-test-subj': dataTestSubj = 'multiselectFilter',
  title,
  items,
  selectedItems,
  width,
  grow = false,
  footer,
  onSelectionChange = noop,
  renderLabel = String,
  renderItem = renderLabel,
}: MultiselectFilterProps<T>) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, _unused, closePopover, togglePopover] = useBoolState();
  const hasFooter = Boolean(footer);

  const options: Array<MultiselectFilterOption<T>> = useMemo(() => {
    const checked: FilterChecked = 'on';
    return items.map((item) => ({
      originalItem: item,
      label: renderLabel(item),
      checked: selectedItems.includes(item) ? checked : undefined,
    }));
  }, [items, renderLabel, selectedItems]);

  const onChange = useCallback<
    NonNullable<EuiSelectableProps<MultiselectFilterOption<T>>['onChange']>
  >(
    (newItems, _event, changedOption) => {
      onSelectionChange(
        newItems.filter(({ checked }) => checked === 'on').map(({ originalItem }) => originalItem),
        changedOption.originalItem,
        changedOption.checked ?? 'off'
      );
    },
    [onSelectionChange]
  );

  return (
    <EuiPopover
      aria-label={title}
      data-test-subj={dataTestSubj}
      button={
        <EuiFilterButton
          data-test-subj={`${dataTestSubj}-popoverButton`}
          iconType="chevronSingleDown"
          grow={grow}
          numFilters={items.length}
          numActiveFilters={selectedItems.length}
          hasActiveFilters={selectedItems.length > 0}
          isSelected={isPopoverOpen}
          onClick={togglePopover}
        >
          {title}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize={hasFooter ? 'none' : 's'}
      repositionOnScroll
    >
      <EuiSelectable
        data-test-subj={`${dataTestSubj}-item`}
        onChange={onChange}
        options={options}
        renderOption={({ originalItem }) => renderItem(originalItem)}
      >
        {(list) => {
          const footerNode = typeof footer === 'function' ? footer(closePopover) : footer;
          return (
            <div style={{ width }}>
              {hasFooter ? <div style={{ padding: euiTheme.size.s }}>{list}</div> : list}
              {footerNode ? (
                <EuiPopoverFooter paddingSize="s">{footerNode}</EuiPopoverFooter>
              ) : null}
            </div>
          );
        }}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const MultiselectFilter = React.memo(
  MultiselectFilterComponent
) as typeof MultiselectFilterComponent; // The cast is necessary because React.memo does not support generics
