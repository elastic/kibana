/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TestProviders } from '../../../common/mock';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ExceptionsTableUtilityBar } from '.';

describe('ExceptionsTableUtilityBar', () => {
  it('displays correct exception lists label and refresh rules action button', () => {
    const EXCEPTION_LISTS_NUMBER = 25;
    render(
      <TestProviders>
        <ExceptionsTableUtilityBar
          onRefresh={jest.fn()}
          totalExceptionLists={EXCEPTION_LISTS_NUMBER}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('showingExceptionLists')).toBeInTheDocument();
    expect(screen.getByTestId('refreshRulesAction')).toBeInTheDocument();
    expect(screen.getByText(`Showing ${EXCEPTION_LISTS_NUMBER} lists`)).toBeInTheDocument();
  });

  it('invokes refresh on refresh action click', () => {
    const mockRefresh = jest.fn();
    render(
      <TestProviders>
        <ExceptionsTableUtilityBar onRefresh={mockRefresh} totalExceptionLists={1} />
      </TestProviders>
    );

    const buttonWrapper = screen.getByTestId('refreshRulesAction');
    within(buttonWrapper).getByRole('button').click();

    expect(mockRefresh).toHaveBeenCalled();
  });

  describe('sort control', () => {
    const sortFields = [
      { field: 'created_at', label: 'Created At', defaultOrder: 'desc' as const },
    ];

    const renderWithSort = (order: string, setSort = jest.fn()) =>
      render(
        <TestProviders>
          <ExceptionsTableUtilityBar
            totalExceptionLists={1}
            sort={{ field: 'created_at', order }}
            setSort={setSort}
            sortFields={sortFields}
          />
        </TestProviders>
      );

    it('includes the current sort direction in the trigger accessible name', () => {
      const { rerender } = renderWithSort('desc');

      expect(
        screen.getByRole('button', { name: 'Sort by: Created At, descending' })
      ).toBeInTheDocument();

      rerender(
        <TestProviders>
          <ExceptionsTableUtilityBar
            totalExceptionLists={1}
            sort={{ field: 'created_at', order: 'asc' }}
            setSort={jest.fn()}
            sortFields={sortFields}
          />
        </TestProviders>
      );

      expect(
        screen.getByRole('button', { name: 'Sort by: Created At, ascending' })
      ).toBeInTheDocument();
    });

    it('includes the current sort direction in the selected menu item accessible name', () => {
      renderWithSort('asc');

      fireEvent.click(screen.getByRole('button', { name: 'Sort by: Created At, ascending' }));

      expect(
        screen.getByRole('menuitem', { name: 'Created At sorted ascending' })
      ).toBeInTheDocument();
    });

    it('toggles the sort order and announces the new sort state', () => {
      const setSort = jest.fn();
      renderWithSort('desc', setSort);

      fireEvent.click(screen.getByRole('button', { name: 'Sort by: Created At, descending' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Created At sorted descending' }));

      expect(setSort).toHaveBeenCalledWith({ field: 'created_at', order: 'asc' });
      expect(screen.getByText('Sorted by Created At, ascending')).toBeInTheDocument();
    });
  });
});
