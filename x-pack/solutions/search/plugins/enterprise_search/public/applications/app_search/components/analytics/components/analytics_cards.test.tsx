/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiStat } from '@elastic/eui';

import { AnalyticsCards } from '.';

describe('AnalyticsCards', () => {
  it('renders', () => {
    const wrapper = shallow(
      <AnalyticsCards
        stats={[
          {
            stat: 100,
            text: 'Red fish',
            dataTestSubj: 'RedFish',
          },
          {
            stat: 2000,
            text: 'Blue fish',
            dataTestSubj: 'BlueFish',
          },
        ]}
      />
    );

    expect(wrapper.find(EuiStat)).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="RedFish"]').prop('title')).toEqual(100);
    expect(wrapper.find('[data-test-subj="RedFish"]').prop('description')).toEqual('Red fish');
    expect(wrapper.find('[data-test-subj="BlueFish"]').prop('title')).toEqual(2000);
    expect(wrapper.find('[data-test-subj="BlueFish"]').prop('description')).toEqual('Blue fish');
  });
});
