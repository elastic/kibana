/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiselectFilter } from '.';

describe('MultiselectFilter', () => {
  const renderFilter = (getItemTestSubj?: (item: string) => string) =>
    render(
      <MultiselectFilter<string>
        data-test-subj="filter"
        title="Filter"
        items={['a', 'b']}
        selectedItems={['a']}
        width={200}
        getItemTestSubj={getItemTestSubj}
      />
    );

  it('gives each option row the test subject of its item', () => {
    renderFilter((item) => `filter-item-${item}`);
    fireEvent.click(screen.getByTestId('filter-popoverButton'));

    expect(screen.getByTestId('filter-item-a')).toBeInTheDocument();
    expect(screen.getByTestId('filter-item-b')).toBeInTheDocument();
  });

  it('gives the option rows no test subject of their own by default', () => {
    renderFilter();
    fireEvent.click(screen.getByTestId('filter-popoverButton'));

    expect(screen.queryByTestId('filter-item-a')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});
