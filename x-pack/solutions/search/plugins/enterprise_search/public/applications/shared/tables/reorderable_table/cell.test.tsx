/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { Cell } from './cell';

describe('Cell', () => {
  it('renders a table cell with the provided content and styles', () => {
    const wrapper = shallow(
      <Cell flexBasis="foo" flexGrow={0} alignItems="bar">
        Content
      </Cell>
    );
    expect(wrapper.props()).toEqual({
      style: {
        flexBasis: 'foo',
        flexGrow: 0,
        alignItems: 'bar',
      },
      children: 'Content',
    });
  });
});
