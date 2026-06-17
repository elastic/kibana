/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders } from '../../mock';
import { LinkIcon } from '.';

describe('LinkIcon', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <LinkIcon href="#" iconSide="right" iconSize="xxl" iconType="warning" dataTestSubj="link">
        {'Test link'}
      </LinkIcon>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders an action button when onClick is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon iconType="warning" dataTestSubj="link" onClick={() => alert('Test alert')}>
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('button').first().exists()).toBe(true);
  });

  test('it renders an action link when href is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon href="#" iconType="warning" dataTestSubj="link">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('a').first().exists()).toBe(true);
  });

  test('it renders an icon', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon dataTestSubj="link" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('[data-euiicon-type]').first().exists()).toBe(true);
  });

  test('it positions the icon to the right when iconSide is right', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon dataTestSubj="link" iconSide="right" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.siemLinkIcon').at(1)).toHaveStyleRule('flex-direction', 'row-reverse');
  });

  test('it positions the icon to the left when iconSide is left (or not provided)', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon dataTestSubj="link" iconSide="left" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.siemLinkIcon').at(1)).not.toHaveStyleRule(
      'flex-direction',
      'row-reverse'
    );
  });

  test('it renders a label', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkIcon dataTestSubj="link" iconType="warning">
          {'Test link'}
        </LinkIcon>
      </TestProviders>
    );

    expect(wrapper.find('.siemLinkIcon__label').first().exists()).toBe(true);
  });
});
