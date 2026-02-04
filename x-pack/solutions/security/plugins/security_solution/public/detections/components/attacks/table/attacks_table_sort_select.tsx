/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiSelectable, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { GroupingSort } from '@kbn/grouping/src';
import * as i18n from './translations';

export const ATTACKS_TABLE_SORT_SELECT_TEST_ID = 'attacks-table-sort-select';
export const ATTACKS_TABLE_SORT_SELECT_OPTIONS_TEST_ID = 'attacks-table-sort-select-options';

type SortOptionKey = 'mostRecent' | 'leastRecent' | 'mostAlerts' | 'leastAlerts';

type SortOption = EuiSelectableOption & {
  key: SortOptionKey;
  sortValue: GroupingSort;
};

export const DEFAULT_ATTACKS_SORT: GroupingSort = [{ latestTimestamp: { order: 'desc' } }];

const options: SortOption[] = [
  {
    key: 'mostRecent',
    label: i18n.MOST_RECENT,
    sortValue: DEFAULT_ATTACKS_SORT,
    append: <EuiIcon type="sortDown" />,
  },
  {
    key: 'leastRecent',
    label: i18n.LEAST_RECENT,
    sortValue: [{ latestTimestamp: { order: 'asc' } }],
    append: <EuiIcon type="sortUp" />,
  },
  {
    key: 'mostAlerts',
    label: i18n.MOST_ALERTS,
    // The >_count suffix tells Elasticsearch to access the doc_count value from the filter aggregation,
    // which is a numeric value that can be used for sorting.
    // https://www.elastic.co/docs/reference/aggregations/pipeline#buckets-path-syntax
    sortValue: [{ 'attackRelatedAlerts>_count': { order: 'desc' } }],
    append: <EuiIcon type="sortDown" />,
  },
  {
    key: 'leastAlerts',
    label: i18n.LEAST_ALERTS,
    // The >_count suffix tells Elasticsearch to access the doc_count value from the filter aggregation,
    // which is a numeric value that can be used for sorting.
    // https://www.elastic.co/docs/reference/aggregations/pipeline#buckets-path-syntax
    sortValue: [{ 'attackRelatedAlerts>_count': { order: 'asc' } }],
    append: <EuiIcon type="sortUp" />,
  },
];

export interface AttacksTableSortSelectProps {
  sort: GroupingSort;
  onChange: (sort: GroupingSort) => void;
}

export const AttacksTableSortSelect = React.memo(
  ({ sort, onChange }: AttacksTableSortSelectProps) => {
    const { euiTheme } = useEuiTheme();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const selectedOption = useMemo(() => {
      // Simple comparison based on structure
      const currentSortJson = JSON.stringify(sort);
      return options.find((o) => JSON.stringify(o.sortValue) === currentSortJson) || options[0];
    }, [sort]);

    const selectableOptions = useMemo<SortOption[]>(
      () =>
        options.map((o) => ({
          ...o,
          checked: o.key === selectedOption.key ? 'on' : undefined,
        })),
      [selectedOption]
    );

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((isOpen) => !isOpen);
    }, []);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const onSelectChange = useCallback(
      (newOptions: SortOption[]) => {
        const selected = newOptions.find((o) => o.checked === 'on');
        if (selected) {
          onChange(selected.sortValue);
          closePopover();
        }
      },
      [closePopover, onChange]
    );

    const button = (
      <EuiButtonEmpty
        data-test-subj={ATTACKS_TABLE_SORT_SELECT_TEST_ID}
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        size="xs"
      >
        {`${i18n.SORT_BY}: ${selectedOption.label}`}
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        panelStyle={{ minWidth: euiTheme.base * 18 }}
      >
        <EuiSelectable<SortOption>
          singleSelection="always"
          options={selectableOptions}
          onChange={onSelectChange}
          data-test-subj={ATTACKS_TABLE_SORT_SELECT_OPTIONS_TEST_ID}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

AttacksTableSortSelect.displayName = 'AttacksTableSortSelect';
