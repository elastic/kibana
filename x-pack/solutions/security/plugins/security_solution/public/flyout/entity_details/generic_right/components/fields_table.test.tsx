/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FieldsTable } from './fields_table';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockDocument = {
  field1: 'value1',
  field2: true,
  field3: null,
  field4: {
    nestedField1: 'nestedValue1',
    nestedField2: 123,
  },
};

const mockStorageKey = 'testStorageKey';

describe('FieldsTable', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it('renders the table with flattened fields and values', () => {
    renderWithQueryClient(<FieldsTable document={mockDocument} />);

    expect(screen.getByText('field1')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('field2')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('field3')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(screen.getByText('field4.nestedField1')).toBeInTheDocument();
    expect(screen.getByText('nestedValue1')).toBeInTheDocument();
    expect(screen.getByText('field4.nestedField2')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('renders undefined values correctly', () => {
    const docWithUndefined = { field1: undefined };
    renderWithQueryClient(<FieldsTable document={docWithUndefined} />);

    expect(screen.getByText('field1')).toBeInTheDocument();
    expect(screen.getAllByText('undefined').length).toBeGreaterThan(0);
  });

  it('renders object values correctly', () => {
    const docWithObject = { field1: { nestedField: 'nestedValue' } };
    renderWithQueryClient(<FieldsTable document={docWithObject} />);

    expect(screen.getByText('field1.nestedField')).toBeInTheDocument();
    expect(screen.getByText('nestedValue')).toBeInTheDocument();
  });

  it('pins a field when pin button is clicked', async () => {
    renderWithQueryClient(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const pinButton = screen.getAllByRole('button', { name: 'Pin field' })[0];
    expect(pinButton).toBeInTheDocument();

    fireEvent.click(pinButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unpin field' })).toBeInTheDocument();
    });
  });

  it('loads pinned fields from localStorage', () => {
    localStorage.setItem(mockStorageKey, JSON.stringify(['field1']));
    renderWithQueryClient(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const unpinButton = screen.getByLabelText('Unpin field');
    expect(unpinButton).toBeInTheDocument();
  });

  it('does not render pin buttons without storage key', () => {
    renderWithQueryClient(<FieldsTable document={mockDocument} />);

    expect(screen.queryByLabelText('Pin field')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unpin field')).not.toBeInTheDocument();
  });

  it('renders pinned fields at the top based on localStorage', () => {
    localStorage.setItem(mockStorageKey, JSON.stringify(['field2', 'field4.nestedField1']));
    renderWithQueryClient(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const rows = screen.getAllByRole('row');
    const rowText = rows.map((row) => row.textContent);
    expect(rowText[1]).toContain('field2');
    expect(rowText[2]).toContain('field4.nestedField1');
  });

  it('sets default pinned fields when localStorage is empty', async () => {
    // Set the default fields without field2
    const defaultPinnedFields = ['field1', 'field3'];

    renderWithQueryClient(
      <FieldsTable
        document={mockDocument}
        tableStorageKey={'new-test-storage-key'}
        defaultPinnedFields={defaultPinnedFields}
      />
    );

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const rowText = rows.map((row) => row.textContent);

      expect(rowText[1]).toContain('field1');
      expect(rowText[2]).toContain('field3');
    });

    await waitFor(() => {
      const pinButtons = screen.getAllByLabelText('Pin field');
      expect(pinButtons.length).toBeGreaterThan(0);
    });
  });
});
