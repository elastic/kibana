/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle } from '@elastic/eui';

export interface TableSkeletonColumn {
  /**
   * Share of the row's width this column takes, relative to the other columns, on the growth
   * scale `EuiFlexItem` accepts.
   */
  grow: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Width of the placeholder bar within the column, as a CSS length. */
  barWidth: string;
}

export interface TableSkeletonRowProps {
  columns: readonly TableSkeletonColumn[];
  /** Height of every bar in the row, as a CSS length. */
  barHeight: string;
}

/** One row of placeholder bars, laid out in the column shares the header and the body share. */
export const TableSkeletonRow = ({ columns, barHeight }: TableSkeletonRowProps) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
    {columns.map(({ grow, barWidth }, column) => (
      <EuiFlexItem key={column} grow={grow}>
        <EuiSkeletonRectangle width={barWidth} height={barHeight} borderRadius="s" />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
