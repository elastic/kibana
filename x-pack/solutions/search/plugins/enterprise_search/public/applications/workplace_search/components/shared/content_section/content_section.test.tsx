/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSpacer } from '@elastic/eui';

import { ViewContentHeader } from '../view_content_header';

import { ContentSection } from '.';

const props = {
  children: <div className="children" />,
  testSubj: 'contentSection',
};

describe('ContentSection', () => {
  it('renders', () => {
    const wrapper = shallow(<ContentSection {...props} className="test" />);

    expect(wrapper.prop('data-test-subj')).toEqual('contentSection');
    expect(wrapper.prop('className')).toEqual('test');
    expect(wrapper.find('.children')).toHaveLength(1);
  });

  it('displays title and description', () => {
    const wrapper = shallow(<ContentSection {...props} title="foo" description="bar" />);
    const header = wrapper.find(ViewContentHeader);

    expect(header.prop('title')).toEqual('foo');
    expect(header.prop('description')).toEqual('bar');
    expect(header.prop('headingLevel')).toEqual(3);
  });

  it('sets heading level for personal dashboard', () => {
    const wrapper = shallow(
      <ContentSection {...props} isOrganization={false} title="foo" description="bar" />
    );
    const header = wrapper.find(ViewContentHeader);

    expect(header.prop('headingLevel')).toEqual(2);
  });

  it('displays header content', () => {
    const wrapper = shallow(
      <ContentSection
        {...props}
        title="h"
        headerSpacer="s"
        headerChildren={<div className="header" />}
      />
    );

    expect(wrapper.find(EuiSpacer)).toHaveLength(1);
    expect(wrapper.find('.header')).toHaveLength(1);
  });
});
