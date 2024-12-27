/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { ApiLogsTable } from '../../api_logs';

import { RecentApiLogs } from './recent_api_logs';

describe('RecentApiLogs', () => {
  const actions = {
    fetchApiLogs: jest.fn(),
    pollForApiLogs: jest.fn(),
  };

  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    wrapper = shallow(<RecentApiLogs />);
  });

  it('renders the recent API logs table', () => {
    expect(wrapper.prop('title')).toEqual(<h2>Recent API events</h2>);
    expect(wrapper.find(ApiLogsTable)).toHaveLength(1);
  });

  it('calls fetchApiLogs on page load and starts pollForApiLogs', () => {
    expect(actions.fetchApiLogs).toHaveBeenCalledTimes(1);
    expect(actions.pollForApiLogs).toHaveBeenCalledTimes(1);
  });
});
