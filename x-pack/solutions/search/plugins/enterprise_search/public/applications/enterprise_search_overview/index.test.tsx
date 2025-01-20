/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ProductSelector } from './components/product_selector';
import { SetupGuide } from './components/setup_guide';

import { EnterpriseSearchOverview } from '.';

describe('EnterpriseSearchOverview', () => {
  it('renders the Setup Guide and Product Selector', () => {
    setMockValues({
      errorConnectingMessage: '',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<EnterpriseSearchOverview />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });
});
