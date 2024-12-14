/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import OverflowButton from './overflow';

describe('OverflowButton', () => {
  const props = {
    field: 'host.name',
    ownFocus: false,
    showTooltip: true,
    value: 'mac',
    closePopOver: jest.fn(),
    items: [<div />],
    isOverflowPopoverOpen: false,
  };
  test('should render a popover', () => {
    const wrapper = shallow(<OverflowButton {...props} />);
    expect(wrapper.find('EuiPopover').exists()).toBeTruthy();
  });

  test('the popover always contains a class that hides it when an overlay (e.g. the inspect modal) is displayed', () => {
    const wrapper = shallow(<OverflowButton {...props} />);
    expect(wrapper.find('EuiPopover').prop('panelClassName')).toEqual('withHoverActions__popover');
  });

  test('should enable repositionOnScroll', () => {
    const wrapper = shallow(<OverflowButton {...props} />);
    expect(wrapper.find('EuiPopover').prop('repositionOnScroll')).toEqual(true);
  });

  test('should render a tooltip if showTooltip is true', () => {
    const testProps = {
      ...props,
      showTooltip: true,
    };
    const wrapper = shallow(<OverflowButton {...testProps} />);
    expect(wrapper.find('EuiToolTip').exists()).toBeTruthy();
  });
});
