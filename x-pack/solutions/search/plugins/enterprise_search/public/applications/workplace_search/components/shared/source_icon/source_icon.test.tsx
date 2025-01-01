/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiIcon } from '@elastic/eui';

import { SourceIcon } from '.';

describe('SourceIcon', () => {
  it('renders', () => {
    const wrapper = shallow(<SourceIcon name="Jira" serviceType="custom" />);

    expect(wrapper.find(EuiIcon)).toHaveLength(1);
    expect(wrapper.find('.user-group-source')).toHaveLength(0);
  });

  it('renders a png icon if one is provided', () => {
    const wrapper = shallow(
      <SourceIcon name="Jira" serviceType="custom" iconAsBase64="base64encodedstring" />
    );

    expect(wrapper.find(EuiIcon).prop('type')).toEqual('data:image/png;base64,base64encodedstring');
  });
});
