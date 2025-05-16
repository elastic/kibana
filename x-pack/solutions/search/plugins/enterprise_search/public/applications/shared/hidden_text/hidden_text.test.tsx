/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { HiddenText } from '.';

describe('HiddenText', () => {
  it('provides the passed "text" in a "hiddenText" field, with all characters obfuscated', () => {
    const wrapper = shallow(
      <HiddenText text="hidden_test">{({ hiddenText }) => <div>{hiddenText}</div>}</HiddenText>
    );
    expect(wrapper.text()).toEqual('•••••••••••');
  });

  it('provides a "toggle" function, which when called, changes "hiddenText" to the original unobfuscated text', () => {
    let toggleFn = () => {};

    const wrapper = shallow(
      <HiddenText text="hidden_test">
        {({ hiddenText, toggle }) => {
          toggleFn = toggle;
          return <div>{hiddenText}</div>;
        }}
      </HiddenText>
    );

    expect(wrapper.text()).toEqual('•••••••••••');
    toggleFn();
    expect(wrapper.text()).toEqual('hidden_test');
    toggleFn();
    expect(wrapper.text()).toEqual('•••••••••••');
  });

  it('provides a "hidden" boolean, which which tracks whether or not the text is obfuscated or not', () => {
    let toggleFn = () => {};
    let isHiddenBool = false;

    shallow(
      <HiddenText text="hidden_test">
        {({ hiddenText, isHidden, toggle }) => {
          isHiddenBool = isHidden;
          toggleFn = toggle;
          return <div>{hiddenText}</div>;
        }}
      </HiddenText>
    );

    expect(isHiddenBool).toEqual(true);
    toggleFn();
    expect(isHiddenBool).toEqual(false);
    toggleFn();
    expect(isHiddenBool).toEqual(true);
  });
});
