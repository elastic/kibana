/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import { SetupInstructions } from './instructions';

describe('SetupInstructions', () => {
  it('renders', () => {
    const wrapper = shallow(<SetupInstructions productName="Workplace Search" />);
    expect(wrapper.find(EuiSteps)).toHaveLength(1);
  });
});
