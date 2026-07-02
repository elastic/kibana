/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TableTab, type TableTabItem } from './base_table_tab';
import { FLYOUT_ERROR_TEST_ID, TABLE_TAB_PIN_ACTION_TEST_ID } from '../components/test_ids';

const TABLE_TEST_ID = 'base-table';
const CAPTION = 'Test table';

const items: TableTabItem[] = [
  { field: 'host.name', value: 'my-host', rawValue: 'my-host' },
  { field: 'user.name', value: ['a', 'b'], rawValue: ['a', 'b'] },
];

const renderTable = (props?: Partial<React.ComponentProps<typeof TableTab>>) =>
  render(
    <IntlProvider locale="en">
      <TableTab items={items} tableCaption={CAPTION} data-test-subj={TABLE_TEST_ID} {...props} />
    </IntlProvider>
  );

describe('<TableTab /> (base_table_tab)', () => {
  it('renders a row for each item with field and stringified value', () => {
    const { getByTestId, getByText } = renderTable();

    expect(getByTestId(TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByText('host.name')).toBeInTheDocument();
    expect(getByText('my-host')).toBeInTheDocument();
    // Array values are joined with ', '.
    expect(getByText('a, b')).toBeInTheDocument();
  });

  it('renders FlyoutError instead of the table when isEmpty is true', () => {
    const { getByTestId, queryByTestId } = renderTable({ isEmpty: true });

    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render the pin column when onPinField is not provided', () => {
    const { queryAllByTestId } = renderTable();

    expect(queryAllByTestId(TABLE_TAB_PIN_ACTION_TEST_ID)).toHaveLength(0);
  });

  it('renders a pin action per row and calls onPinField to pin', () => {
    const onPinField = jest.fn();
    const { getAllByTestId } = renderTable({ onPinField });

    const pinButtons = getAllByTestId(TABLE_TAB_PIN_ACTION_TEST_ID);
    expect(pinButtons).toHaveLength(items.length);

    fireEvent.click(pinButtons[0]);
    expect(onPinField).toHaveBeenCalledWith('host.name', 'pin');
  });

  it('calls onPinField to unpin an already-pinned field', () => {
    const onPinField = jest.fn();
    const { getAllByTestId } = renderTable({ onPinField, pinnedFields: ['host.name'] });

    fireEvent.click(getAllByTestId(TABLE_TAB_PIN_ACTION_TEST_ID)[0]);
    expect(onPinField).toHaveBeenCalledWith('host.name', 'unpin');
  });

  it('uses renderValue for the value cell when provided', () => {
    const renderValue = jest.fn((field: string) => (
      <span data-test-subj={`custom-value-${field}`}>{`custom:${field}`}</span>
    ));
    const { getByTestId } = renderTable({ renderValue });

    expect(getByTestId('custom-value-host.name')).toHaveTextContent('custom:host.name');
    expect(renderValue).toHaveBeenCalled();
  });

  it('uses renderFieldName for the field cell when provided', () => {
    const renderFieldName = (field: string) => (
      <span data-test-subj={`custom-field-${field}`}>{field.toUpperCase()}</span>
    );
    const { getByTestId } = renderTable({ renderFieldName });

    expect(getByTestId('custom-field-host.name')).toHaveTextContent('HOST.NAME');
  });

  it('wraps value cells with renderCellActions, passing the raw value', () => {
    const renderCellActions = jest.fn(({ children, field }) => (
      <span data-test-subj={`cell-action-${field}`}>{children}</span>
    ));
    const { getByTestId } = renderTable({ renderCellActions });

    const wrapped = getByTestId('cell-action-host.name');
    expect(within(wrapped).getByText('my-host')).toBeInTheDocument();
    expect(renderCellActions).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'host.name', value: 'my-host' })
    );
  });
});
