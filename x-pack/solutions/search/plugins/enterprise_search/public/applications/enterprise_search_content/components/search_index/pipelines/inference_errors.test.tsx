/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiLoadingSpinner } from '@elastic/eui';

import { InferenceErrors } from './inference_errors';

describe('InferenceErrors', () => {
  const indexName = 'unit-test-index';
  const defaultValues = {
    indexName,
    isLoading: true,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(defaultValues);
  });
  it('renders spinner when loading data', () => {
    const wrapper = shallow(<InferenceErrors />);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(0);
  });
  it('renders expected table columns', () => {
    setMockValues({
      ...defaultValues,
      inferenceErrors: [],
      isLoading: false,
    });
    const wrapper = shallow(<InferenceErrors />);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
    const table = wrapper.find(EuiBasicTable);
    expect(table.prop('tableLayout')).toEqual('auto');
    expect(table.prop('columns')).toEqual([
      {
        dataType: 'date',
        field: 'timestamp',
        name: expect.any(String),
      },
      {
        dataType: 'string',
        field: 'message',
        name: expect.any(String),
        textOnly: true,
      },
      {
        dataType: 'number',
        field: 'doc_count',
        name: expect.any(String),
      },
    ]);
  });
});
