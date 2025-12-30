/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  ResetFilters,
  RESET_FILTERS_DATA_TEST_ID,
  RESET_FILTERS_ACTION_BUTTON_DATA_TEST_ID,
} from './reset_filters';

describe('ResetFilters', () => {
  const clearFilters = jest.fn();

  afterEach(() => {
    clearFilters.mockClear();
  });

  test('renders correctly', () => {
    const { getByTestId } = render(<ResetFilters clearFilters={clearFilters} />);
    expect(getByTestId(RESET_FILTERS_DATA_TEST_ID)).toBeInTheDocument();
  });

  test('renders the correct title', () => {
    const { getByTestId } = render(<ResetFilters clearFilters={clearFilters} />);
    expect(getByTestId(RESET_FILTERS_DATA_TEST_ID)).toHaveTextContent(
      'No attacks match your search criteria'
    );
  });

  test('renders the correct body', () => {
    const { getByTestId } = render(<ResetFilters clearFilters={clearFilters} />);
    expect(getByTestId(RESET_FILTERS_DATA_TEST_ID)).toHaveTextContent(
      'Adjust your filters, change the time range, or'
    );
  });

  test('renders the correct action button text', () => {
    const { getByTestId } = render(<ResetFilters clearFilters={clearFilters} />);
    expect(getByTestId(RESET_FILTERS_ACTION_BUTTON_DATA_TEST_ID)).toHaveTextContent(
      'Clear all filters'
    );
  });

  test('calls clearFilters when button is clicked', () => {
    const { getByTestId } = render(<ResetFilters clearFilters={clearFilters} />);
    const button = getByTestId(RESET_FILTERS_ACTION_BUTTON_DATA_TEST_ID);

    fireEvent.click(button);

    expect(clearFilters).toHaveBeenCalledTimes(1);
  });
});
