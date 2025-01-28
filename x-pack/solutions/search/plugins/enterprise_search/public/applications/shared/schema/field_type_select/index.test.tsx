/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { SchemaFieldTypeSelect } from '.';

describe('SchemaFieldTypeSelect', () => {
  const updateExistingFieldType = jest.fn();
  const props = {
    fieldName: 'foo',
    fieldType: 'field',
    updateExistingFieldType,
  };

  it('renders', () => {
    const wrapper = shallow(<SchemaFieldTypeSelect {...props} />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
  });

  it('calls updateExistingFieldType when the select value is changed', () => {
    const wrapper = shallow(<SchemaFieldTypeSelect {...props} />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: 'bar' } });

    expect(updateExistingFieldType).toHaveBeenCalledWith(props.fieldName, 'bar');
  });

  it('passes disabled state', () => {
    const wrapper = shallow(<SchemaFieldTypeSelect {...props} disabled />);

    expect(wrapper.find(EuiSelect).prop('disabled')).toEqual(true);
  });

  it('passes arbitrary props', () => {
    const wrapper = shallow(<SchemaFieldTypeSelect {...props} disabled aria-label="Test label" />);

    expect(wrapper.find(EuiSelect).prop('aria-label')).toEqual('Test label');
  });
});
