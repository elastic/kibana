/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { filterFieldsBySearch, FieldsSelectorTable } from './fields_selector_table';
import { TestProviders } from '../../../../common/mock';

const createMockField = (overrides: Partial<DataViewField> & { name: string }): DataViewField =>
  ({
    name: overrides.name,
    customLabel: overrides.customLabel ?? '',
    visualizable: overrides.visualizable ?? true,
  } as unknown as DataViewField);

const mockFields: DataViewField[] = [
  createMockField({ name: 'entity.name', customLabel: 'Entity Name', visualizable: true }),
  createMockField({ name: 'entity.type', customLabel: 'Type', visualizable: true }),
  createMockField({ name: 'host.ip', customLabel: '', visualizable: true }),
  createMockField({ name: '_index', customLabel: '', visualizable: true }),
  createMockField({ name: 'hidden.field', customLabel: '', visualizable: false }),
];

describe('filterFieldsBySearch', () => {
  it('returns all visualizable fields excluding _index', () => {
    const result = filterFieldsBySearch(mockFields);
    const names = result.map((f) => f.name);

    expect(names).toContain('entity.name');
    expect(names).toContain('entity.type');
    expect(names).toContain('host.ip');
    expect(names).not.toContain('_index');
    expect(names).not.toContain('hidden.field');
  });

  it('uses customLabel as displayName', () => {
    const result = filterFieldsBySearch(mockFields);
    const entityNameField = result.find((f) => f.name === 'entity.name');

    expect(entityNameField?.displayName).toBe('Entity Name');
  });

  it('sets displayName to empty string when customLabel is absent', () => {
    const result = filterFieldsBySearch(mockFields);
    const hostIpField = result.find((f) => f.name === 'host.ip');

    expect(hostIpField?.displayName).toBe('');
  });

  it('filters by search query case-insensitively on name', () => {
    const result = filterFieldsBySearch(mockFields, [], 'ENTITY');

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.name)).toEqual(['entity.name', 'entity.type']);
  });

  it('filters by search query matching displayName', () => {
    const result = filterFieldsBySearch(mockFields, [], 'Type');

    expect(result.some((f) => f.name === 'entity.type')).toBe(true);
  });

  it('returns only selected columns when isFilterSelectedEnabled is true', () => {
    const result = filterFieldsBySearch(mockFields, ['host.ip'], undefined, true);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host.ip');
  });

  it('combines search query and selected filter', () => {
    const result = filterFieldsBySearch(mockFields, ['entity.name', 'entity.type'], 'name', true);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('entity.name');
  });

  it('returns empty array when no fields match the search', () => {
    const result = filterFieldsBySearch(mockFields, [], 'nonexistent');

    expect(result).toHaveLength(0);
  });

  it('returns all visualizable fields when searchQuery is undefined', () => {
    const result = filterFieldsBySearch(mockFields, [], undefined);

    expect(result).toHaveLength(3);
  });

  it('returns empty array when isFilterSelectedEnabled is true and visibleColumns is empty', () => {
    const result = filterFieldsBySearch(mockFields, [], undefined, true);

    expect(result).toHaveLength(0);
  });
});

const createMockDataView = (fields: DataViewField[]): DataView =>
  ({
    fields: {
      getAll: () => fields,
      length: fields.length,
    },
  } as unknown as DataView);

describe('FieldsSelectorTable', () => {
  const defaultProps = {
    title: 'Fields',
    dataView: createMockDataView(mockFields),
    columns: ['entity.name'],
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a table with field checkboxes', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} />
      </TestProviders>
    );

    expect(
      screen.getByTestId('entity-analytics-fields-selector-item-entity.name')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('entity-analytics-fields-selector-item-entity.type')
    ).toBeInTheDocument();
    expect(screen.getByTestId('entity-analytics-fields-selector-item-host.ip')).toBeInTheDocument();
  });

  it('checked state reflects the columns prop', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} columns={['entity.name', 'host.ip']} />
      </TestProviders>
    );

    const entityNameCheckbox = screen.getByTestId(
      'entity-analytics-fields-selector-item-entity.name'
    ) as HTMLInputElement;
    const entityTypeCheckbox = screen.getByTestId(
      'entity-analytics-fields-selector-item-entity.type'
    ) as HTMLInputElement;
    const hostIpCheckbox = screen.getByTestId(
      'entity-analytics-fields-selector-item-host.ip'
    ) as HTMLInputElement;

    expect(entityNameCheckbox.checked).toBe(true);
    expect(entityTypeCheckbox.checked).toBe(false);
    expect(hostIpCheckbox.checked).toBe(true);
  });

  it('calls onAddColumn when an unchecked checkbox is checked', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} columns={[]} />
      </TestProviders>
    );

    const checkbox = screen.getByTestId('entity-analytics-fields-selector-item-entity.name');
    fireEvent.click(checkbox);

    expect(defaultProps.onAddColumn).toHaveBeenCalledWith('entity.name');
  });

  it('calls onRemoveColumn when a checked checkbox is unchecked', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} columns={['entity.name']} />
      </TestProviders>
    );

    const checkbox = screen.getByTestId('entity-analytics-fields-selector-item-entity.name');
    fireEvent.click(checkbox);

    expect(defaultProps.onRemoveColumn).toHaveBeenCalledWith('entity.name');
  });

  it('shows the correct field count in the table header', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} />
      </TestProviders>
    );

    const fieldsCount = screen.getByTestId('entityAnalytics:dataTable:fieldsModal:fieldsCount');
    expect(fieldsCount).toHaveTextContent('3');
  });

  it('shows error message when dataView has no fields', () => {
    const emptyDataView = createMockDataView([]);

    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} dataView={emptyDataView} />
      </TestProviders>
    );

    expect(screen.getByText('No fields found in the data view')).toBeInTheDocument();
  });

  it('view toggle switches between all and selected', () => {
    render(
      <TestProviders>
        <FieldsSelectorTable {...defaultProps} columns={['entity.name']} />
      </TestProviders>
    );

    expect(screen.getByTestId('viewSelectorButton')).toHaveTextContent('View: all');

    fireEvent.click(screen.getByTestId('viewSelectorButton'));
    fireEvent.click(screen.getByTestId('viewSelectorOption-selected'));

    expect(screen.getByTestId('viewSelectorButton')).toHaveTextContent('View: selected');

    const fieldsCount = screen.getByTestId('entityAnalytics:dataTable:fieldsModal:fieldsCount');
    expect(fieldsCount).toHaveTextContent('1');
  });
});
