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
import { FilterIn } from '../utils/filter';
import { Indicator } from '../../../../common/types/indicator';
import { FILTER_FOR_TITLE } from './translations';

const ICON_TYPE = 'plusInCircle';

export interface FilterInProps {
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

export interface FilterInCellActionProps extends FilterInProps {
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
 * @returns filter in button icon
 */
export const FilterInButtonIcon: VFC<FilterInProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterIn });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_FOR_TITLE}>
      <EuiButtonIcon
        aria-label={FILTER_FOR_TITLE}
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
 * @returns filter in button empty
 */
export const FilterInButtonEmpty: VFC<FilterInProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterIn });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_FOR_TITLE}>
      <EuiButtonEmpty
        aria-label={FILTER_FOR_TITLE}
        iconType={ICON_TYPE}
        iconSize="s"
        color="primary"
        onClick={filterFn}
        data-test-subj={dataTestSub}
      >
        {FILTER_FOR_TITLE}
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
export const FilterInContextMenu: VFC<FilterInProps> = ({
  data,
  field,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterIn });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiContextMenuItem
      key="filterIn"
      icon="plusInCircle"
      size="s"
      onClick={filterFn}
      data-test-subj={dataTestSub}
    >
      {FILTER_FOR_TITLE}
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
export const FilterInCellAction: VFC<FilterInCellActionProps> = ({
  data,
  field,
  Component,
  'data-test-subj': dataTestSub,
}) => {
  const { filterFn } = useFilterInOut({ indicator: data, field, filterType: FilterIn });
  if (!filterFn) {
    return null;
  }

  return (
    <EuiToolTip content={FILTER_FOR_TITLE}>
      <EuiFlexItem data-test-subj={dataTestSub}>
        <Component aria-label={FILTER_FOR_TITLE} iconType={ICON_TYPE} onClick={filterFn}>
          {FILTER_FOR_TITLE}
        </Component>
      </EuiFlexItem>
    </EuiToolTip>
  );
};
