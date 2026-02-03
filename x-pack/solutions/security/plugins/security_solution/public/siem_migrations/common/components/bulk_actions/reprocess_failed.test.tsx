/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ReprocessFailedItemsButton } from './reprocess_failed';
import { getRuleMigrationRuleMock } from '../../../../../common/siem_migrations/model/__mocks__';

describe('ReprocessFailedItemsButton', () => {
  const mockOnClick = jest.fn();

  const defaultProps = {
    isAuthorized: true,
    isDisabled: false,
    isLoading: false,
    numberOfFailedItems: 5,
    onClick: mockOnClick,
    selectedItems: [],
  };

  it('renders the button with correct text when no items are selected', () => {
    const { getByText } = render(<ReprocessFailedItemsButton {...defaultProps} />);
    expect(getByText('Reprocess failed (5)')).toBeInTheDocument();
  });

  it('renders the button with correct text when items are selected', () => {
    const selectedItems = [getRuleMigrationRuleMock({ status: 'failed' })];
    const { getByText } = render(
      <ReprocessFailedItemsButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByText('Reprocess selected failed (1)')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const { getByTestId } = render(<ReprocessFailedItemsButton {...defaultProps} />);
    fireEvent.click(getByTestId('reprocessFailedItemsButton'));
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('disables the button when isDisabled is true', () => {
    const { getByTestId } = render(
      <ReprocessFailedItemsButton {...defaultProps} isDisabled={true} />
    );
    expect(getByTestId('reprocessFailedItemsButton')).toBeDisabled();
  });

  it('disables the button when isAuthorized is false', () => {
    const { getByTestId } = render(
      <ReprocessFailedItemsButton {...defaultProps} isAuthorized={false} />
    );
    expect(getByTestId('reprocessFailedItemsButton')).toBeDisabled();
  });

  it('shows a loading spinner when isLoading is true', () => {
    const { getByTestId } = render(
      <ReprocessFailedItemsButton {...defaultProps} isLoading={true} />
    );
    expect(
      getByTestId('reprocessFailedItemsButton').querySelector('[class*="euiLoadingSpinner"]')
    ).toBeInTheDocument();
  });
});
