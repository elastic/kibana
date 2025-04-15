/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { CellValue } from './render_cell';
import { TestProviders } from '../../../../common/mock';
import { getEmptyValue } from '../../../../common/components/empty_value';

describe('CellValue', () => {
  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const columnId = 'columnId';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
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
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
      </TestProviders>
    );

    expect(getByText('value1')).toBeInTheDocument();
  });

  it('should handle a number value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 123,
    };
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
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
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
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
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
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
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
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
    const columnId = 'field1';

    const { getByText } = render(
      <TestProviders>
        <CellValue alert={alert} columnId={columnId} />
      </TestProviders>
    );

    expect(getByText('[object Object]')).toBeInTheDocument();
  });
});
