/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import { HeaderButtons } from '.';
import { getMigrationsStatsMock } from '../__mocks__';
import { TestProviders } from '../../../../common/mock';

describe('HeaderButtons', () => {
  const onMigrationIdChange = jest.fn();

  it('renders the component', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderButtons
          migrationType="dashboard"
          migrationsStats={getMigrationsStatsMock()}
          selectedMigrationId="1"
          onMigrationIdChange={onMigrationIdChange}
        />
      </TestProviders>
    );
    expect(getByTestId('siemMigrationsSelectMigrationButton')).toBeInTheDocument();
  });

  it('marks only the option with the selected migration id as selected when names are duplicated', () => {
    const [first, second] = getMigrationsStatsMock();
    const migrationsWithDuplicateNames = [
      { ...first, name: 'Same name', id: '1' },
      { ...second, name: 'Same name', id: '2' },
    ];

    const { getByTestId } = render(
      <TestProviders>
        <HeaderButtons
          migrationType="dashboard"
          migrationsStats={migrationsWithDuplicateNames}
          selectedMigrationId="1"
          onMigrationIdChange={onMigrationIdChange}
        />
      </TestProviders>
    );

    const siemMigrationsSelectMigrationButton = getByTestId('siemMigrationsSelectMigrationButton');
    const comboBoxToggleListButton = within(siemMigrationsSelectMigrationButton).getByTestId(
      'comboBoxToggleListButton'
    );
    fireEvent.click(comboBoxToggleListButton);

    const option1 = getByTestId('migrationSelectionOption-1');
    const option2 = getByTestId('migrationSelectionOption-2');

    expect(option1).toHaveAttribute('aria-selected', 'true');
    expect(option2).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onMigrationIdChange when a migration is selected', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <HeaderButtons
          migrationType="dashboard"
          migrationsStats={getMigrationsStatsMock()}
          selectedMigrationId="1"
          onMigrationIdChange={onMigrationIdChange}
        />
      </TestProviders>
    );

    const siemMigrationsSelectMigrationButton = getByTestId('siemMigrationsSelectMigrationButton');
    const comboBoxToggleListButton = within(siemMigrationsSelectMigrationButton).getByTestId(
      'comboBoxToggleListButton'
    );
    fireEvent.click(comboBoxToggleListButton);
    fireEvent.click(getByText('Migration 2'));

    expect(onMigrationIdChange).toHaveBeenCalledWith('2');
  });

  it('renders the add another migration button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderButtons
          migrationType="dashboard"
          migrationsStats={getMigrationsStatsMock()}
          selectedMigrationId="1"
          onMigrationIdChange={onMigrationIdChange}
        />
      </TestProviders>
    );
    expect(getByTestId('addAnotherMigrationButton')).toBeInTheDocument();
  });

  it('should render the migration vendor badge', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderButtons
          migrationType="dashboard"
          migrationsStats={getMigrationsStatsMock()}
          selectedMigrationId="2"
          onMigrationIdChange={onMigrationIdChange}
        />
      </TestProviders>
    );

    expect(getByTestId('migrationVendorBadge')).toBeInTheDocument();
    expect(getByTestId('migrationVendorBadge')).toHaveTextContent('QRadar');
  });
});
