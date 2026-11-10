/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttributeFilter } from './attribute_filter';
import { useAttributeValues } from './use_attribute_values';

jest.mock('./use_attribute_values');

const mockUseAttributeValues = useAttributeValues as jest.MockedFunction<typeof useAttributeValues>;

const renderAttributeFilter = (selected: string[] = []) =>
  render(
    <AttributeFilter
      attribute="os.type"
      label="Operating system"
      types={['host']}
      filters={{}}
      timeRange={{ from: 'now-15m', to: 'now' }}
      selected={selected}
      onChange={jest.fn()}
    />
  );

const openList = () =>
  userEvent.click(screen.getByTestId('entityInventoryAttributeFilter-os.type'));

describe('AttributeFilter', () => {
  it('asks for the values of the attribute', () => {
    mockUseAttributeValues.mockReturnValue({ values: [], invalidSelections: [], isLoading: true });

    renderAttributeFilter(['linux']);

    expect(mockUseAttributeValues).toHaveBeenCalledWith({
      attribute: 'os.type',
      types: ['host'],
      filters: {},
      selected: ['linux'],
      timeRange: { from: 'now-15m', to: 'now' },
    });
  });

  it('lists the values and the invalid selections', async () => {
    mockUseAttributeValues.mockReturnValue({
      values: ['linux'],
      invalidSelections: ['windows'],
      isLoading: false,
    });

    renderAttributeFilter(['windows']);
    await openList();

    expect(screen.getByRole('option', { name: 'linux' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /windows/ })).toBeInTheDocument();
  });

  it('shows an error message when the values could not be loaded', async () => {
    mockUseAttributeValues.mockReturnValue({
      values: [],
      invalidSelections: [],
      isLoading: false,
      error: new Error('failed'),
    });

    renderAttributeFilter();
    await openList();

    expect(screen.getByText('The values could not be loaded')).toBeInTheDocument();
  });
});
