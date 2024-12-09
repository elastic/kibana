/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { DeleteDomainPanel } from './delete_domain_panel';

const MOCK_VALUES = {
  domain: { id: '9876' },
};

const MOCK_ACTIONS = {
  deleteDomain: jest.fn(),
};

describe('DeleteDomainPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('contains a button to delete the domain', () => {
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    const confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));

    const wrapper = shallow(<DeleteDomainPanel />);
    wrapper.find(EuiButton).simulate('click');

    expect(MOCK_ACTIONS.deleteDomain).toHaveBeenCalledWith(MOCK_VALUES.domain);
  });

  it("doesn't throw if the users chooses not to confirm", () => {
    setMockValues(MOCK_VALUES);

    const confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => false));

    const wrapper = shallow(<DeleteDomainPanel />);
    wrapper.find(EuiButton).simulate('click');
  });

  // The user should never encounter this state, the containing AppSearchTemplate should be loading until
  // the relevant domain has been loaded.  However we must account for the possibility in this component.
  it('is empty if domain has not yet been set', () => {
    setMockValues({
      ...MOCK_VALUES,
      domain: null,
    });

    const wrapper = shallow(<DeleteDomainPanel />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
