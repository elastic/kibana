/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { NewApiEventsPrompt } from '.';

describe('NewApiEventsPrompt', () => {
  const values = {
    hasNewData: true,
  };
  const actions = {
    onUserRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<NewApiEventsPrompt />);

    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('does not render if no new data has been polled', () => {
    setMockValues({ ...values, hasNewData: false });
    const wrapper = shallow(<NewApiEventsPrompt />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('calls onUserRefresh', () => {
    const wrapper = shallow(<NewApiEventsPrompt />);

    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(actions.onUserRefresh).toHaveBeenCalled();
  });
});
