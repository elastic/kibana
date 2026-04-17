/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntitiesEmptyState } from './empty_state';
import { TEST_SUBJ_EMPTY_STATE } from './constants';
import { TestProviders } from '../../../../common/mock';

describe('EntitiesEmptyState', () => {
  const onResetFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the correct data-test-subj', () => {
    render(
      <TestProviders>
        <EntitiesEmptyState onResetFilters={onResetFilters} />
      </TestProviders>
    );

    expect(screen.getByTestId(TEST_SUBJ_EMPTY_STATE)).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(
      <TestProviders>
        <EntitiesEmptyState onResetFilters={onResetFilters} />
      </TestProviders>
    );

    expect(screen.getByText('No results match your search criteria')).toBeInTheDocument();
  });

  it('displays the body text', () => {
    render(
      <TestProviders>
        <EntitiesEmptyState onResetFilters={onResetFilters} />
      </TestProviders>
    );

    expect(screen.getByText('Try modifying your search or filter set')).toBeInTheDocument();
  });

  it('renders a Reset filters button', () => {
    render(
      <TestProviders>
        <EntitiesEmptyState onResetFilters={onResetFilters} />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });

  it('calls onResetFilters when the Reset filters button is clicked', () => {
    render(
      <TestProviders>
        <EntitiesEmptyState onResetFilters={onResetFilters} />
      </TestProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});
