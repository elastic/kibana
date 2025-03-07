/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('undefined')).toBeInTheDocument();
  });

  it('renders object values correctly', () => {
    const documentWithObject = { field1: { nestedField: 'nestedValue' } };
    render(<FieldsTable document={documentWithObject} />);

    expect(screen.getByText('field1.nestedField')).toBeInTheDocument();
    expect(screen.getByText('nestedValue')).toBeInTheDocument();
  });
});
