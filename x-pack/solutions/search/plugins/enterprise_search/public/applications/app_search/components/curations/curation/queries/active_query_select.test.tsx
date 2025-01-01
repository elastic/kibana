/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { ActiveQuerySelect } from '.';

describe('ActiveQuerySelect', () => {
  const values = {
    queries: ['hello', 'world'],
    activeQuery: 'world',
    queriesLoading: false,
  };

  const actions = {
    setActiveQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders select options that correspond to activeQuery & queries', () => {
    const wrapper = shallow(<ActiveQuerySelect />);

    expect(wrapper.find(EuiSelect).prop('options')).toHaveLength(2);
    expect(wrapper.find(EuiSelect).prop('value')).toEqual('world');
  });

  it('renders a loading state based on queriesLoading', () => {
    setMockValues({ ...values, queriesLoading: true });
    const wrapper = shallow(<ActiveQuerySelect />);

    expect(wrapper.find(EuiSelect).prop('isLoading')).toEqual(true);
  });

  it('calls setActiveQuery on select change', () => {
    const wrapper = shallow(<ActiveQuerySelect />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: 'new active query' } });

    expect(actions.setActiveQuery).toHaveBeenCalledWith('new active query');
  });
});
