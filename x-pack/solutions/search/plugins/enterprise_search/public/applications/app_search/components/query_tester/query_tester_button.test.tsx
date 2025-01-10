/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { QueryTesterFlyout, QueryTesterButton } from '.';

describe('QueryTesterButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<QueryTesterButton />);
    expect(wrapper.find(EuiButtonEmpty).exists()).toBe(true);
    expect(wrapper.find(QueryTesterFlyout).exists()).toBe(false);
  });

  it('will render a QueryTesterFlyout when pressed and close on QueryTesterFlyout close', () => {
    const wrapper = shallow(<QueryTesterButton />);
    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(wrapper.find(QueryTesterFlyout).exists()).toBe(true);

    wrapper.find(QueryTesterFlyout).simulate('close');
    expect(wrapper.find(QueryTesterFlyout).exists()).toBe(false);
  });
});
