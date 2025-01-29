/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { AddDomainFormSubmitButton } from './add_domain_form_submit_button';

describe('AddDomainFormSubmitButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is disabled when the domain has not been validated', () => {
    setMockValues({
      allowSubmit: false,
    });

    const wrapper = shallow(<AddDomainFormSubmitButton />);

    expect(wrapper.prop('disabled')).toBe(true);
  });

  it('is enabled when the domain has been validated', () => {
    setMockValues({
      allowSubmit: true,
    });

    const wrapper = shallow(<AddDomainFormSubmitButton />);

    expect(wrapper.prop('disabled')).toBe(false);
  });

  it('submits the domain on click', () => {
    const submitNewDomain = jest.fn();

    setMockActions({
      submitNewDomain,
    });
    setMockValues({
      allowSubmit: true,
    });

    const wrapper = shallow(<AddDomainFormSubmitButton />);

    wrapper.find(EuiButton).simulate('click');

    expect(submitNewDomain).toHaveBeenCalled();
  });
});
