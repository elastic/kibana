/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';

import { AndBadgeComponent } from './and_badge';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: {
    euiColorLightShade: '#ece',
  },
});

describe('AndBadgeComponent', () => {
  test('it renders entryItemIndexItemEntryFirstRowAndBadge for very first item', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndBadgeComponent entriesLength={2} entryItemIndex={0} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()).toBeTruthy();
  });

  test('it renders entryItemEntryInvisibleAndBadge if "entriesLength" is 1 or less', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndBadgeComponent entriesLength={1} entryItemIndex={0} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="entryItemEntryInvisibleAndBadge"]').exists()
    ).toBeTruthy();
  });

  test('it renders regular "and" badge if item is not the first one and includes more than one entry', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <AndBadgeComponent entriesLength={2} entryItemIndex={1} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemEntryAndBadge"]').exists()).toBeTruthy();
  });
});
