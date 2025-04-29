/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { SelectableText } from '.';

describe('SelectableText', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<SelectableText>{'You may select this text'}</SelectableText>);
    expect(wrapper).toMatchSnapshot();
  });

  test('it applies the user-select: text style', () => {
    const wrapper = mount(<SelectableText>{'You may select this text'}</SelectableText>);

    expect(wrapper).toHaveStyleRule('user-select', 'text');
  });
});
