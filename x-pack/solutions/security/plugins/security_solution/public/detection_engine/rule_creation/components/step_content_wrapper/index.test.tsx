/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepContentWrapper } from '.';

describe('StepContentWrapper', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<StepContentWrapper />);

    expect(wrapper.find('div')).toHaveLength(1);
  });
});
