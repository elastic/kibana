/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NoApiIntegrationKeyCallOut } from '.';

describe('no_api_integration_callout', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<NoApiIntegrationKeyCallOut />);

    expect(wrapper.find('EuiCallOut')).toBeTruthy();
  });
});
