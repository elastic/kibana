/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { FormKeyName } from '.';

describe('FormKeyName', () => {
  const values = {
    activeApiToken: { name: '' },
    activeApiTokenRawName: '',
    activeApiTokenExists: false,
  };
  const actions = {
    setNameInputBlurred: jest.fn(),
    setTokenName: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<FormKeyName />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    expect(wrapper.find(EuiFieldText).prop('placeholder')).toEqual('i.e., my-engine-key');
    expect(wrapper.find(EuiFieldText).prop('value')).toEqual('');
    expect(wrapper.find(EuiFieldText).prop('disabled')).toEqual(false);
    expect(wrapper.find(EuiFormRow).prop('helpText')).toEqual('');
  });

  it('shows help text if the raw name does not match the expected name', () => {
    setMockValues({
      ...values,
      activeApiToken: { name: 'my-engine-key' },
      activeApiTokenRawName: 'my engine key!!',
    });
    const wrapper = shallow(<FormKeyName />);

    expect(wrapper.find(EuiFormRow).prop('helpText')).toEqual(
      'Your key will be named: my-engine-key'
    );
  });

  it('controls the input value', () => {
    setMockValues({
      ...values,
      activeApiTokenRawName: 'test',
    });
    const wrapper = shallow(<FormKeyName />);

    expect(wrapper.find(EuiFieldText).prop('value')).toEqual('test');
  });

  it('disables the input if editing an existing key', () => {
    setMockValues({
      ...values,
      activeApiTokenExists: true,
    });
    const wrapper = shallow(<FormKeyName />);

    expect(wrapper.find(EuiFieldText).prop('disabled')).toEqual(true);
  });

  it('calls setTokenName when the input value is changed', () => {
    const wrapper = shallow(<FormKeyName />);
    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'changed' } });

    expect(actions.setTokenName).toHaveBeenCalledWith('changed');
  });

  it('calls setNameInputBlurred when the user stops focusing the input', () => {
    const wrapper = shallow(<FormKeyName />);
    wrapper.find(EuiFieldText).simulate('blur');

    expect(actions.setNameInputBlurred).toHaveBeenCalledWith(true);
  });
});
