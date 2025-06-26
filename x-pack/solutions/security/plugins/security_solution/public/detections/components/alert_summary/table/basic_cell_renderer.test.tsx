/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { BASIC_CELL_RENDERER_TRUNCATE_TEST_ID, BasicCellRenderer } from './basic_cell_renderer';
import { TestProviders } from '../../../../common/mock';
import { getEmptyValue } from '../../../../common/components/empty_value';

describe('BasicCellRenderer', () => {
  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'field';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });

  it('should handle string value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText('value1')).toBeInTheDocument();
  });

  it('should handle number value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 123,
    };
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={columnId} />
      </TestProviders>
    );

    expect(getByText('123')).toBeInTheDocument();
  });

  it('should handle array of booleans', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [true, false],
    };
    const field = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText('true, false')).toBeInTheDocument();
  });

  it('should handle array of numbers', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [1, 2],
    };
    const field = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText('1, 2')).toBeInTheDocument();
  });

  it('should handle array of null', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [null, null],
    };
    const field = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText(',')).toBeInTheDocument();
  });

  it('should join array of JsonObjects', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [{ subField1: 'value1', subField2: 'value2' }],
    };
    const field = 'field1';

    const { getByText } = render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    expect(getByText('[object Object]')).toBeInTheDocument();
  });

  it('should truncate long values and show tooltip', async () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'field1';

    render(
      <TestProviders>
        <BasicCellRenderer alert={alert} field={field} />
      </TestProviders>
    );

    const cell = screen.getByTestId(BASIC_CELL_RENDERER_TRUNCATE_TEST_ID);

    expect(cell).toBeInTheDocument();
    expect(cell.firstChild).toHaveClass('euiToolTipAnchor');
  });
});
