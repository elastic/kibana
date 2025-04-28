/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TruncatableText } from '.';

describe('TruncatableText', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = mount(<TruncatableText>{'Hiding in plain sight'}</TruncatableText>);
    expect(wrapper).toMatchSnapshot();
  });

  test('it adds the hidden overflow style', () => {
    const wrapper = mount(<TruncatableText>{'Hiding in plain sight'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('overflow', 'hidden');
  });

  test('it adds the ellipsis text-overflow style', () => {
    const wrapper = mount(<TruncatableText>{'Dramatic pause'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('text-overflow', 'ellipsis');
  });

  test('it adds the nowrap white-space style', () => {
    const wrapper = mount(<TruncatableText>{'Who stopped the beats?'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('white-space', 'nowrap');
  });

  test('it can add tooltip', () => {
    const testText = 'Some really really really really really long text.';
    const wrapper = mount(<TruncatableText tooltipContent={testText}>{testText}</TruncatableText>);

    expect(wrapper.find('EuiToolTip').text()).toEqual(testText);
  });
});
