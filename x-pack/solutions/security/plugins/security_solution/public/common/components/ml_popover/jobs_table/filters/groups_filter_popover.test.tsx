/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { GroupsFilterPopoverComponent } from './groups_filter_popover';
import { mockSecurityJobs } from '../../api.mock';
import type { SecurityJob } from '../../types';
import { cloneDeep } from 'lodash/fp';

describe('GroupsFilterPopover', () => {
  let securityJobs: SecurityJob[];

  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <GroupsFilterPopoverComponent
        securityJobs={securityJobs}
        onSelectedGroupsChanged={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('when a filter is clicked, it becomes checked ', () => {
    const mockOnSelectedGroupsChanged = jest.fn();
    const wrapper = mount(
      <GroupsFilterPopoverComponent
        securityJobs={securityJobs}
        onSelectedGroupsChanged={mockOnSelectedGroupsChanged}
      />
    );

    wrapper.find('button[data-test-subj="groups-filter-popover-button"]').first().simulate('click');
    wrapper.update();

    wrapper.find('EuiFilterSelectItemClass').first().simulate('click');
    wrapper.update();

    expect(wrapper.find('EuiFilterSelectItemClass').first().prop('checked')).toEqual('on');
  });
});
