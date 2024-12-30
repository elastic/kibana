/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { NonTextFieldsHeader } from './non_text_fields_header';

describe('NonTextFieldsHeader', () => {
  it('renders', () => {
    const wrapper = shallow(<NonTextFieldsHeader />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });
});
