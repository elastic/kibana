/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { QueryTesterButton } from '../query_tester';

import { KibanaHeaderActions } from './kibana_header_actions';

describe('KibanaHeaderActions', () => {
  const values = {
    engineName: 'foo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<KibanaHeaderActions />);
    expect(wrapper.find(QueryTesterButton).exists()).toBe(true);
  });

  it('does not render a "Query Tester" button if there is no engine available', () => {
    setMockValues({
      engineName: '',
    });
    const wrapper = shallow(<KibanaHeaderActions />);
    expect(wrapper.find(QueryTesterButton).exists()).toBe(false);
  });
});
