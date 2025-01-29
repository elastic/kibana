/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, render } from '@testing-library/react';

import type { MultiSelectPopoverProps } from './multiselect_popover';
import { MultiSelectPopover } from './multiselect_popover';

const mockSelectedItemsChange = jest.fn();

const defaultProps = {
  title: 'title',
  allItems: ['a', 'b', 'c'],
  selectedItems: [],
  onSelectedItemsChange: mockSelectedItemsChange,
};

const renderComponent = (overrides?: Partial<MultiSelectPopoverProps>) =>
  render(<MultiSelectPopover {...defaultProps} {...overrides} />);

describe('MultiSelectPopOver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all items', () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.click(getByTestId('multiselect-popover-button'));

    expect(getByText('title')).toBeInTheDocument();
    expect(getByText('a')).toBeInTheDocument();
    expect(getByText('b')).toBeInTheDocument();
    expect(getByText('c')).toBeInTheDocument();
  });

  it('calls onSelectedItemdChange when item is clicked', () => {
    const { getByText, getByTestId } = renderComponent();

    fireEvent.click(getByTestId('multiselect-popover-button'));
    fireEvent.click(getByText('a'));

    expect(mockSelectedItemsChange).toHaveBeenCalledWith(['a']);
  });

  it('shows selected items as selected', () => {
    const { getByText, getByTestId } = renderComponent({ selectedItems: ['a'] });
    fireEvent.click(getByTestId('multiselect-popover-button'));

    // confirm there is a 'check mark' next to the selected item
    expect(getByText('a').parentElement?.firstChild?.firstChild).toHaveAttribute(
      'data-euiicon-type',
      'check'
    );
    expect(getByText('1')).toBeInTheDocument();
  });
});
