/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { render } from '../../../utils/test_helper';
import { CompositeSloToolbar } from './composite_slo_toolbar';

const defaultProps = {
  search: '',
  isLoading: false,
  selectedTags: [],
  availableTags: ['tag-a', 'tag-b'],
  hasActiveFilters: false,
  onSearchChange: jest.fn(),
  onTagSelectionChange: jest.fn(),
  onClearFilters: jest.fn(),
};

describe('CompositeSloToolbar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the search field', () => {
    render(<CompositeSloToolbar {...defaultProps} />);
    expect(screen.getByTestId('compositeSloListSearch')).toBeInTheDocument();
  });

  it('renders the tags filter button', () => {
    render(<CompositeSloToolbar {...defaultProps} />);
    expect(screen.getByTestId('compositeSloListTagFilter')).toBeInTheDocument();
  });

  it('shows "Clear filters" disabled when no active filters', () => {
    render(<CompositeSloToolbar {...defaultProps} hasActiveFilters={false} />);
    expect(screen.getByTestId('compositeSloListClearFilters')).toBeDisabled();
  });

  it('shows "Clear filters" enabled when hasActiveFilters is true', () => {
    render(<CompositeSloToolbar {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByTestId('compositeSloListClearFilters')).not.toBeDisabled();
  });

  it('calls onClearFilters when the "Clear filters" button is clicked', () => {
    const onClearFilters = jest.fn();
    render(
      <CompositeSloToolbar
        {...defaultProps}
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />
    );
    fireEvent.click(screen.getByTestId('compositeSloListClearFilters'));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('calls onSearchChange when the search field value changes', () => {
    const onSearchChange = jest.fn();
    render(<CompositeSloToolbar {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByTestId('compositeSloListSearch'), {
      target: { value: 'checkout' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('checkout');
  });

  it('reflects the controlled search value', () => {
    render(<CompositeSloToolbar {...defaultProps} search="payment" />);
    expect(screen.getByTestId('compositeSloListSearch')).toHaveValue('payment');
  });
});
