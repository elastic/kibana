/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPopover, EuiCopy, EuiButton, EuiButtonIcon } from '@elastic/eui';

import { StatusItem } from '.';

describe('SourceRow', () => {
  const details = ['foo', 'bar'];
  it('renders', () => {
    const wrapper = shallow(<StatusItem details={details} />);

    expect(wrapper.find(EuiPopover)).toHaveLength(1);
  });

  it('renders the copy button', () => {
    const copyMock = jest.fn();
    const wrapper = shallow(<StatusItem details={details} />);
    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);

    expect(copyEl.find(EuiButton).props().onClick).toEqual(copyMock);
  });

  it('handles popover visibility toggle click', () => {
    const wrapper = shallow(<StatusItem details={details} />);
    const button = wrapper.find(EuiPopover).dive().find(EuiButtonIcon);
    button.simulate('click');

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);

    wrapper.find(EuiPopover).prop('closePopover')();

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(false);
  });
});
