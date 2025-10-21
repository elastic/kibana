/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { InstallTranslatedButton } from './install_translated';
import { getDashboardMigrationDashboardMock } from '../../../../../common/siem_migrations/model/__mocks__';

describe('InstallTranslatedButton', () => {
  const mockInstallTranslatedItems = jest.fn();
  const mockInstallSelectedItem = jest.fn();

  const defaultProps = {
    disableInstallTranslatedItemsButton: false,
    installTranslatedItems: mockInstallTranslatedItems,
    installSelectedItem: mockInstallSelectedItem,
    isLoading: false,
    numberOfTranslatedItems: 5,
    selectedItems: [],
  };

  it('renders the button with correct text when no items are selected', () => {
    const { getByText } = render(<InstallTranslatedButton {...defaultProps} />);
    expect(getByText('Install translated (5)')).toBeInTheDocument();
  });

  it('renders the button with correct text when items are selected', () => {
    const selectedItems = [getDashboardMigrationDashboardMock()];
    const { getByText } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByText('Install selected (1)')).toBeInTheDocument();
  });

  it('calls installTranslatedItems when no items are selected and button is clicked', () => {
    const { getByTestId } = render(<InstallTranslatedButton {...defaultProps} />);
    fireEvent.click(getByTestId('installTranslatedItemsButton'));
    expect(mockInstallTranslatedItems).toHaveBeenCalled();
  });

  it('calls installSelectedItem when items are selected and button is clicked', () => {
    const selectedItems = [getDashboardMigrationDashboardMock()];
    const { getByTestId } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    fireEvent.click(getByTestId('installSelectedItemsButton'));
    expect(mockInstallSelectedItem).toHaveBeenCalled();
  });

  it('disables the button when disableInstallTranslatedItemsButton is true', () => {
    const { getByTestId } = render(
      <InstallTranslatedButton {...defaultProps} disableInstallTranslatedItemsButton={true} />
    );
    expect(getByTestId('installTranslatedItemsButton')).toBeDisabled();
  });

  it('shows a loading spinner when isLoading is true', () => {
    const { getByTestId } = render(<InstallTranslatedButton {...defaultProps} isLoading={true} />);
    expect(
      getByTestId('installTranslatedItemsButton').querySelector('[class*="euiLoadingSpinner"]')
    ).toBeInTheDocument();
  });
});
