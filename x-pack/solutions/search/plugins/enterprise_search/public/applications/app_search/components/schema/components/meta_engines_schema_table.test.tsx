/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiTable, EuiTableHeaderCell, EuiTableRow, EuiTableRowCell } from '@elastic/eui';

import { MetaEnginesSchemaTable } from '.';

describe('MetaEnginesSchemaTable', () => {
  const values = {
    schema: {
      some_text_field: 'text',
      some_number_field: 'number',
    },
    fields: {
      some_text_field: {
        text: ['engine1', 'engine2'],
      },
      some_number_field: {
        number: ['engine1', 'engine2', 'engine3', 'engine4'],
      },
    },
  };

  setMockValues(values);
  const wrapper = mount(<MetaEnginesSchemaTable />);
  const fieldNames = wrapper.find('EuiTableRowCell[data-test-subj="fieldName"]');
  const engines = wrapper.find('EuiTableRowCell[data-test-subj="engines"]');
  const fieldTypes = wrapper.find('EuiTableRowCell[data-test-subj="fieldType"]');

  it('renders', () => {
    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell).at(0).text()).toEqual('Field name');
    expect(wrapper.find(EuiTableHeaderCell).at(1).text()).toEqual('Engines');
    expect(wrapper.find(EuiTableHeaderCell).at(2).text()).toEqual('Field type');
  });

  it('always renders an initial ID row', () => {
    expect(wrapper.find('code').at(0).text()).toEqual('id');
    expect(wrapper.find(EuiTableRowCell).at(1).text()).toEqual('All');
  });

  it('renders subsequent table rows for each schema field', () => {
    expect(wrapper.find(EuiTableRow)).toHaveLength(3);

    expect(fieldNames.at(0).text()).toEqual('some_text_field');
    expect(engines.at(0).text()).toEqual('engine1, engine2');
    expect(fieldTypes.at(0).text()).toEqual('text');

    expect(fieldNames.at(1).text()).toEqual('some_number_field');
    expect(engines.at(1).text()).toEqual('engine1, engine2, engine3, +1');
    expect(fieldTypes.at(1).text()).toEqual('number');
  });
});
