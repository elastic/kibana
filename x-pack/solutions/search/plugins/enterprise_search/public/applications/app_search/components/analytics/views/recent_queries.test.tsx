/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { RecentQueriesTable } from '../components';

import { RecentQueries } from '.';

describe('RecentQueries', () => {
  it('renders', () => {
    setMockValues({ recentQueries: [] });
    const wrapper = shallow(<RecentQueries />);

    expect(wrapper.find(RecentQueriesTable)).toHaveLength(1);
  });
});
