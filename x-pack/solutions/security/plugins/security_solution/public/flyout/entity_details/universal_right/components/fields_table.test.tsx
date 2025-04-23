/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldsTable } from './fields_table';

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
  it('renders the table with flattened fields and values', () => {
    render(<FieldsTable document={mockDocument} />);

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
    const documentWithUndefined = { field1: undefined };
    render(<FieldsTable document={documentWithUndefined} />);

    expect(screen.getByText('field1')).toBeInTheDocument();
    expect(screen.getAllByText('undefined').length).toBe(2); // one rendered as field value, one rendered as icon tooltip value
  });

  it('renders object values correctly', () => {
    const documentWithObject = { field1: { nestedField: 'nestedValue' } };
    render(<FieldsTable document={documentWithObject} />);

    expect(screen.getByText('field1.nestedField')).toBeInTheDocument();
    expect(screen.getByText('nestedValue')).toBeInTheDocument();
  });

  it('pins a field when pin button is clicked', () => {
    render(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const pinButton = screen.getAllByLabelText('Pin field')[0];
    expect(pinButton).toBeInTheDocument();
    fireEvent.click(pinButton);

    expect(pinButton.getAttribute('aria-label')).toBe('Unpin field');
  });

  it('loads pinned fields from localStorage', () => {
    localStorage.setItem(mockStorageKey, JSON.stringify(['field1']));

    render(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const pinButton = screen.getAllByLabelText('Unpin field')[0];
    expect(pinButton).toBeInTheDocument();
    expect(pinButton.getAttribute('aria-label')).toBe('Unpin field');
  });

  it('does not pin fields if tableStorageKey is not provided', () => {
    render(<FieldsTable document={mockDocument} />);

    // No pin button should be visible if tableStorageKey is not passed
    const pinButton = screen.queryByLabelText('Pin field');
    const unpinButton = screen.queryByLabelText('Unpin field');
    expect(pinButton).not.toBeInTheDocument();
    expect(unpinButton).not.toBeInTheDocument();
  });

  it('pins fields to the top based on pinned fields from localStorage', () => {
    localStorage.setItem(mockStorageKey, JSON.stringify(['field2', 'field4.nestedField1']));

    render(<FieldsTable document={mockDocument} tableStorageKey={mockStorageKey} />);

    const firstRow = screen.getByText('field2');
    const secondRow = screen.getByText('field4.nestedField1');

    expect(firstRow).toBeInTheDocument();
    expect(secondRow).toBeInTheDocument();
  });
});
