/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';
import moment from 'moment';

import { EuiTableRow } from '@elastic/eui';

import { GroupRow, NO_SOURCES_MESSAGE } from './group_row';

describe('GroupRow', () => {
  it('renders', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
  });

  it('renders fromNow date string when in range', () => {
    const wrapper = shallow(
      <GroupRow {...groups[0]} updatedAt={moment().subtract(7, 'days').format()} />
    );

    expect(wrapper.find('small').text()).toEqual('Last updated 7 days ago.');
  });

  it('renders formatted date string when out of range', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} updatedAt={'2020-01-01'} />);

    expect(wrapper.find('small').text()).toEqual('Last updated January 1, 2020.');
  });

  it('renders empty sources message when no sources present', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} contentSources={[]} />);

    expect(wrapper.find('.user-group__sources').text()).toEqual(NO_SOURCES_MESSAGE);
  });
});
