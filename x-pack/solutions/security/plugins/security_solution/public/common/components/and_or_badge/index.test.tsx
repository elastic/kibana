/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';

import { AndOrBadge } from '.';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiColorLightShade: '#ece' } });

describe('AndOrBadge', () => {
  test('it renders top and bottom antenna bars when "includeAntennas" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndOrBadge includeAntennas type="and" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('AND');
    expect(wrapper.find('[data-test-subj="andOrBadgeBarTop"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="andOrBadgeBarBottom"]').exists()).toBeTruthy();
  });

  test('it does not render top and bottom antenna bars when "includeAntennas" is false', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndOrBadge type="or" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('OR');
    expect(wrapper.find('[data-test-subj="andOrBadgeBarTop"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="andOrBadgeBarBottom"]').exists()).toBeFalsy();
  });

  test('it renders "and" when "type" is "and"', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndOrBadge type="and" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('AND');
  });

  test('it renders "or" when "type" is "or"', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndOrBadge type="or" />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="and-or-badge"]').at(0).text()).toEqual('OR');
  });
});
