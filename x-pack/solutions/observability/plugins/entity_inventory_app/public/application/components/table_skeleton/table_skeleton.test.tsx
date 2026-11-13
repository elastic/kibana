/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TableSkeleton } from './table_skeleton';
import type { TableSkeletonColumn } from './table_skeleton_row';

const COLUMNS: readonly TableSkeletonColumn[] = [
  { grow: 2, barWidth: '40%' },
  { grow: 3, barWidth: '85%' },
];

const renderSkeleton = (rowCount: number) =>
  render(
    <TableSkeleton
      columns={COLUMNS}
      rowCount={rowCount}
      contentAriaLabel="Loading the things"
      dataTestSubj="thingsSkeleton"
    />
  );

describe('TableSkeleton', () => {
  it('draws one header row and the requested number of body rows, with no text in them', () => {
    renderSkeleton(3);

    const skeleton = screen.getByTestId('thingsSkeleton');
    const headerRows = within(skeleton).getAllByTestId('thingsSkeletonHeaderRow');
    expect(headerRows).toHaveLength(1);
    expect(headerRows[0].textContent).toBe('');
    expect(within(skeleton).getAllByTestId('thingsSkeletonRow')).toHaveLength(3);
  });

  it('draws a bar per column in every row', () => {
    renderSkeleton(2);

    const skeleton = screen.getByTestId('thingsSkeleton');
    const rows = [
      ...within(skeleton).getAllByTestId('thingsSkeletonHeaderRow'),
      ...within(skeleton).getAllByTestId('thingsSkeletonRow'),
    ];
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      // The bars are hidden from assistive technology: `contentAriaLabel` speaks for the whole
      // skeleton, so a reader is not read five placeholders per row.
      expect(within(row).getAllByRole('progressbar', { hidden: true })).toHaveLength(
        COLUMNS.length
      );
    });
  });
});
