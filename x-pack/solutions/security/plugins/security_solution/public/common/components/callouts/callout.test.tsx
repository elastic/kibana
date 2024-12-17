/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TestProviders } from '../../mock';
import { CallOut } from './callout';
import type { CallOutMessage } from './callout_types';

describe('callout', () => {
  let message: CallOutMessage = {
    type: 'primary',
    id: 'some-id',
    title: 'title',
    description: <>{'some description'}</>,
  };

  beforeEach(() => {
    message = {
      type: 'primary',
      id: 'some-id',
      title: 'title',
      description: <>{'some description'}</>,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the callout data-test-subj from the given id', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-some-id"]')).toEqual(true);
  });

  test('renders the callout dismiss button by default', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-dismiss-btn"]')).toEqual(true);
  });

  test('renders the callout dismiss button if given an explicit true to enable it', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} showDismissButton={true} />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-dismiss-btn"]')).toEqual(true);
  });

  test('Does NOT render the callout dismiss button if given an explicit false to disable it', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} showDismissButton={false} />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-dismiss-btn"]')).toEqual(false);
  });

  test('onDismiss callback operates when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} onDismiss={onDismiss} />
      </TestProviders>
    );
    wrapper.find('button[data-test-subj="callout-dismiss-btn"]').first().simulate('click');
    expect(onDismiss).toBeCalledWith(message);
  });

  test('dismissButtonText can be set', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} dismissButtonText={'Some other text'} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="callout-dismiss-btn"]').first().text()).toEqual(
      'Some other text'
    );
  });

  test('a default icon type of "iInCircle" will be chosen if no iconType is set and the message type is "primary"', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="callout-some-id"]').first().prop('iconType')).toEqual(
      'iInCircle'
    );
  });

  test('icon type can be changed from the type within the message', () => {
    const wrapper = mount(
      <TestProviders>
        <CallOut message={message} iconType={'something_else'} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="callout-some-id"]').first().prop('iconType')).toEqual(
      'something_else'
    );
  });
});
