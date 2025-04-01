/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { TextExpansionErrors } from './text_expansion_errors';

describe('TextExpansionErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  const error = {
    title: 'some-error-title',
    message: 'some-error-message',
  };
  it('extracts error panel with the given title and message', () => {
    const wrapper = shallow(<TextExpansionErrors error={error} />);
    expect(wrapper.find(EuiCallOut).length).toBe(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual(error.title);
    expect(wrapper.find(EuiCallOut).find('p').length).toBe(1);
    expect(wrapper.find(EuiCallOut).find('p').text()).toEqual(error.message);
  });
});
