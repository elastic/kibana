/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { CurationActionBar } from './curation_action_bar';

describe('CurationActionBar', () => {
  const actions = {
    acceptSuggestion: jest.fn(),
    rejectSuggestion: jest.fn(),
  };

  beforeAll(() => {
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CurationActionBar />);

    wrapper.find('[data-test-subj="rejectButton"]').simulate('click');
    expect(actions.rejectSuggestion).toHaveBeenCalled();

    wrapper.find('[data-test-subj="acceptButton"]').simulate('click');
    expect(actions.acceptSuggestion).toHaveBeenCalled();
  });
});
