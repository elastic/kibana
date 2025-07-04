/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiFlexGridProps } from '@elastic/eui';
import { OverviewGridItemLoader } from './overview_grid_item_loader';

export const OverviewLoader = ({
  rows,
  columns,
  style,
}: {
  rows?: number;
  columns?: EuiFlexGridProps['columns'];
  style?: { height: string };
}) => {
  const ROWS = rows ?? 4;
  const COLUMNS = columns ?? 4;
  const loaders = Array(ROWS * COLUMNS).fill(null);
  return (
    <EuiFlexGrid gutterSize="m" columns={COLUMNS} css={style}>
      {loaders.map((_, i) => (
        <EuiFlexItem key={i}>
          <OverviewGridItemLoader />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
