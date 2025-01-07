/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { CurationActionsPopover } from './curation_actions_popover';

describe('CurationActionsPopover', () => {
  const actions = {
    acceptSuggestion: jest.fn(),
    acceptAndAutomateSuggestion: jest.fn(),
    rejectSuggestion: jest.fn(),
    rejectAndDisableSuggestion: jest.fn(),
  };

  beforeAll(() => {
    setMockActions(actions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<CurationActionsPopover />);
    expect(wrapper.isEmptyRender()).toBe(false);

    wrapper.find('[data-test-subj="acceptButton"]').simulate('click');
    expect(actions.acceptSuggestion).toHaveBeenCalled();

    wrapper.find('[data-test-subj="automateButton"]').simulate('click');
    expect(actions.acceptAndAutomateSuggestion).toHaveBeenCalled();

    wrapper.find('[data-test-subj="rejectButton"]').simulate('click');
    expect(actions.rejectSuggestion).toHaveBeenCalled();

    wrapper.find('[data-test-subj="turnoffButton"]').simulate('click');
    expect(actions.rejectAndDisableSuggestion).toHaveBeenCalled();
  });

  it('can open and close', () => {
    const wrapper = shallow(<CurationActionsPopover />);

    expect(wrapper.prop('isOpen')).toBe(false);

    const button = shallow(wrapper.prop('button'));
    button.simulate('click');

    expect(wrapper.prop('isOpen')).toBe(true);

    wrapper.prop('closePopover')();

    expect(wrapper.prop('isOpen')).toBe(false);
  });
});
