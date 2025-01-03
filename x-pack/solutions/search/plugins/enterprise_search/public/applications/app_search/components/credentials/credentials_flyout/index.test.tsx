/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout } from '@elastic/eui';

import { CredentialsFlyout } from '.';

describe('CredentialsFlyout', () => {
  const actions = {
    hideCredentialsForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyout />);
    const flyout = wrapper.find(EuiFlyout);

    expect(flyout).toHaveLength(1);
    expect(flyout.prop('aria-labelledby')).toEqual('credentialsFlyoutTitle');
    expect(flyout.prop('onClose')).toEqual(actions.hideCredentialsForm);
  });
});
