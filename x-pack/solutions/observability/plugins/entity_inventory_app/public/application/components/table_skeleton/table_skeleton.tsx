/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonLoading,
  useEuiTheme,
} from '@elastic/eui';
import type { TableSkeletonColumn } from './table_skeleton_row';
import { TableSkeletonRow } from './table_skeleton_row';

const DEFAULT_COLUMNS: readonly TableSkeletonColumn[] = [
  { grow: 3, barWidth: '85%' },
  { grow: 3, barWidth: '85%' },
  { grow: 3, barWidth: '85%' },
  { grow: 3, barWidth: '85%' },
  { grow: 3, barWidth: '85%' },
];
const DEFAULT_ROW_COUNT = 8;

export interface TableSkeletonProps {
  /** One entry per column, in order; its length is the number of columns drawn. */
  columns?: readonly TableSkeletonColumn[];
  /** How many body rows to draw under the header row. */
  rowCount?: number;
  /** Read out in place of the table while it loads. */
  contentAriaLabel: string;
  /**
   * Set on the skeleton, with `HeaderRow` and `Row` appended for the rows, so a caller's tests
   * address its own skeleton.
   */
  dataTestSubj: string;
}

/**
 * A bordered panel of placeholder bars standing in for a table that has not loaded: one header
 * row, a rule, then `rowCount` body rows. It carries no header text, because a table whose
 * columns arrive with its data has no headers to show yet.
 */
export const TableSkeleton = ({
  columns = DEFAULT_COLUMNS,
  rowCount = DEFAULT_ROW_COUNT,
  contentAriaLabel,
  dataTestSubj,
}: TableSkeletonProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSkeletonLoading
      isLoading
      contentAriaLabel={contentAriaLabel}
      data-test-subj={dataTestSubj}
      loadedContent={null}
      loadingContent={
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <EuiFlexGroup direction="column" gutterSize="s" aria-hidden="true">
            <EuiFlexItem data-test-subj={`${dataTestSubj}HeaderRow`}>
              <TableSkeletonRow columns={columns} barHeight={euiTheme.size.l} />
            </EuiFlexItem>
            <EuiHorizontalRule margin="none" />
            {Array.from({ length: rowCount }, (_, row) => (
              <EuiFlexItem key={row} data-test-subj={`${dataTestSubj}Row`}>
                <TableSkeletonRow columns={columns} barHeight={euiTheme.size.base} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      }
    />
  );
};
