/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AddDomainFormErrors } from './add_domain_form_errors';

describe('AddDomainFormErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is empty when there are no errors', () => {
    setMockValues({
      errors: [],
    });

    const wrapper = shallow(<AddDomainFormErrors />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('displays all the errors from the logic', () => {
    setMockValues({
      errors: ['first error', 'second error'],
    });

    const wrapper = shallow(<AddDomainFormErrors />);

    expect(wrapper.find('p')).toHaveLength(2);
    expect(wrapper.find('p').first().text()).toContain('first error');
    expect(wrapper.find('p').last().text()).toContain('second error');
  });
});
