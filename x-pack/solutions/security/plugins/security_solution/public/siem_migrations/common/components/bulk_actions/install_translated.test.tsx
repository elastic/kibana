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
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { BulkActionsItem } from './types';

describe('InstallTranslatedButton', () => {
  const mockInstallTranslatedItems = jest.fn();
  const mockInstallSelectedItem = jest.fn();

  // By default treat any fully translated item as installable (mirrors the rules migration rule).
  const isInstallable = (item: BulkActionsItem) =>
    item.translation_result === MigrationTranslationResult.FULL;

  const fullItem = {
    ...getDashboardMigrationDashboardMock(),
    id: 'EfDKfJkBBI4hy8QbQ_BC',
    migration_id: '9bcd7ea8-f617-4dc4-ab4a-da323c0a18b3',
    translation_result: MigrationTranslationResult.FULL,
  } as BulkActionsItem;

  const partialItem = {
    ...getDashboardMigrationDashboardMock(),
    id: 'FfDKfJkBBI4hy8QbQ_BD',
    migration_id: '9bcd7ea8-f617-4dc4-ab4a-da323c0a18b3',
    translation_result: MigrationTranslationResult.PARTIAL,
  } as BulkActionsItem;

  const defaultProps = {
    disableInstallTranslatedItemsButton: false,
    installTranslatedItems: mockInstallTranslatedItems,
    installSelectedItem: mockInstallSelectedItem,
    isLoading: false,
    numberOfTranslatedItems: 5,
    selectedItems: [],
    isInstallable,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button with correct text when no items are selected', () => {
    const { getByText } = render(<InstallTranslatedButton {...defaultProps} />);
    expect(getByText('Install translated (5)')).toBeInTheDocument();
  });

  it('renders the button with correct text when installable items are selected', () => {
    const selectedItems: BulkActionsItem[] = [fullItem, { ...fullItem, id: 'other' }];
    const { getByText } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByText('Install selected (2)')).toBeInTheDocument();
  });

  it('counts only installable items when a mix is selected', () => {
    const selectedItems: BulkActionsItem[] = [fullItem, partialItem];
    const { getByText } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByText('Install selected (1)')).toBeInTheDocument();
  });

  it('disables the button when a selection contains no installable items', () => {
    const selectedItems: BulkActionsItem[] = [partialItem];
    const { getByTestId } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByTestId('installSelectedItemsButton')).toBeDisabled();
  });

  it('enables the button when a selection contains at least one installable item', () => {
    const selectedItems: BulkActionsItem[] = [fullItem, partialItem];
    const { getByTestId } = render(
      <InstallTranslatedButton {...defaultProps} selectedItems={selectedItems} />
    );
    expect(getByTestId('installSelectedItemsButton')).not.toBeDisabled();
  });

  it('calls installTranslatedItems when no items are selected and button is clicked', () => {
    const { getByTestId } = render(<InstallTranslatedButton {...defaultProps} />);
    fireEvent.click(getByTestId('installTranslatedItemsButton'));
    expect(mockInstallTranslatedItems).toHaveBeenCalled();
  });

  it('calls installSelectedItem when installable items are selected and button is clicked', () => {
    const selectedItems: BulkActionsItem[] = [fullItem];
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
