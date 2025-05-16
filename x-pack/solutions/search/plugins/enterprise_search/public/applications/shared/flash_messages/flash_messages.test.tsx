/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { FlashMessages } from './flash_messages';

describe('FlashMessages', () => {
  it('renders an array of callouts', () => {
    const mockMessages = [
      { type: 'success', message: 'Hello world!!' },
      {
        type: 'error',
        message: 'Whoa nelly!',
        description: <div data-test-subj="error">Something went wrong</div>,
      },
      { type: 'info', message: 'Everything is fine, nothing is ruined' },
      { type: 'warning', message: 'Uh oh' },
      { type: 'info', message: 'Testing multiples of same type' },
    ];
    setMockValues({ messages: mockMessages });

    const wrapper = shallow(<FlashMessages />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(5);
    expect(wrapper.find(EuiCallOut).first().prop('color')).toEqual('success');
    expect(wrapper.find('[data-test-subj="error"]')).toHaveLength(1);
    expect(wrapper.find(EuiCallOut).last().prop('iconType')).toEqual('iInCircle');
  });

  it('renders any children', () => {
    setMockValues({ messages: [{ type: 'success' }] });

    const wrapper = shallow(
      <FlashMessages>
        <button data-test-subj="testing">
          Some action - you could even clear flash messages here
        </button>
      </FlashMessages>
    );

    expect(wrapper.find('[data-test-subj="testing"]').text()).toContain('Some action');
  });
});
