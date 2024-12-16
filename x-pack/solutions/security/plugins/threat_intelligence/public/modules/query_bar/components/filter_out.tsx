/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { useFilterInOut } from '../hooks/use_filter_in_out';
import { FilterOut } from '../utils/filter';
import { Indicator } from '../../../../common/types/indicator';
import { FILTER_OUT_TITLE } from './translations';

const ICON_TYPE = 'minusInCircle';

export interface FilterOutProps {
  /**
   * Value used to filter in/out in the KQL bar. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value used to filter in /out in the KQL bar.
   */
  field: string;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

export interface FilterOutCellActionProps extends FilterOutProps {
  /**
   * Display component for when the FilterIn component is used within an {@link EuiDataGrid}.
   */
  Component: typeof EuiButtonEmpty | typeof EuiButtonIcon;
}

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 *
 * This component renders an {@link EuiButtonIcon}.
 *
 * @returns filter out button icon
 */
export const FilterOutButtonIcon: VFC<FilterOutProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterOut });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_OUT_TITLE}>
      <EuiButtonIcon
        aria-label={FILTER_OUT_TITLE}
        iconType={ICON_TYPE}
        iconSize="s"
        size="xs"
        color="primary"
        onClick={filterFn}
        data-test-subj={dataTestSub}
      />
    </EuiToolTip>
  );
};

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 *
 * This component renders an {@link EuiButtonEmpty}.
 *
 * @returns filter out button empty
 */
export const FilterOutButtonEmpty: VFC<FilterOutProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterOut });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_OUT_TITLE}>
      <EuiButtonEmpty
        aria-label={FILTER_OUT_TITLE}
        iconType={ICON_TYPE}
        iconSize="s"
        color="primary"
        onClick={filterFn}
        data-test-subj={dataTestSub}
      >
        {FILTER_OUT_TITLE}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 *
 * This component is to be used in an EuiContextMenu.
 *
 * @returns filter in {@link EuiContextMenuItem} for a context menu
 */
export const FilterOutContextMenu: VFC<FilterOutProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterOut });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiContextMenuItem
      key="filterOut"
      icon="minusInCircle"
      size="s"
      onClick={filterFn}
      data-test-subj={dataTestSub}
    >
      {FILTER_OUT_TITLE}
    </EuiContextMenuItem>
  );
};

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 *
 * This component is to be used in an EuiDataGrid.
 *
 * @returns filter in button for data grid
 */
export const FilterOutCellAction: VFC<FilterOutCellActionProps> = ({
  data,
  field,
  Component,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterOut });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_OUT_TITLE}>
      <EuiFlexItem data-test-subj={dataTestSub}>
        <Component aria-label={FILTER_OUT_TITLE} iconType={ICON_TYPE} onClick={filterFn}>
          {FILTER_OUT_TITLE}
        </Component>
      </EuiFlexItem>
    </EuiToolTip>
  );
};
