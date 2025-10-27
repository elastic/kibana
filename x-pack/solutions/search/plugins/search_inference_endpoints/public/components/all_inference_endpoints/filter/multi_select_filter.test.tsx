/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      size: { xl: '16px', m: '8px' },
      border: { thin: '1px solid #ddd' },
    },
  }),
}));

describe('MultiSelectFilter', () => {
  const options: MultiSelectFilterOption[] = [
    { key: '1', label: 'Option 1', checked: 'off' },
    { key: '2', label: 'Option 2', checked: 'on' },
    { key: '3', label: 'Option 3', checked: 'off' },
  ];

  it('renders the filter button with the provided label', () => {
    const { getByText } = render(
      <MultiSelectFilter onChange={() => {}} options={options} buttonLabel="Filter Options" />
    );
    expect(getByText('Filter Options')).toBeInTheDocument();
  });

  it('shows options when the popover is opened', async () => {
    const { getByText, findByText } = render(
      <MultiSelectFilter onChange={() => {}} options={options} buttonLabel="Filter Options" />
    );

    fireEvent.click(getByText('Filter Options'));
    expect(await findByText('Option 1')).toBeInTheDocument();
    expect(getByText('Option 2')).toBeInTheDocument();
    expect(getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange with updated options when an option is clicked', async () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MultiSelectFilter onChange={onChange} options={options} buttonLabel="Filter Options" />
    );

    fireEvent.click(getByText('Filter Options'));
    fireEvent.click(getByText('Option 1'));

    expect(onChange).toHaveBeenCalled();
  });
});
