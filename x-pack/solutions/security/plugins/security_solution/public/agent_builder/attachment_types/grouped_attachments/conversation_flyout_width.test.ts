/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOpenConversationFlyoutWidth } from './conversation_flyout_width';

const rect = (width: number): DOMRect =>
  ({
    width,
    height: 100,
    top: 0,
    left: 0,
    right: width,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);

const mountFlyout = (testSubj: string, width: number): HTMLElement => {
  const flyout = document.createElement('div');
  flyout.setAttribute('data-test-subj', testSubj);
  jest.spyOn(flyout, 'getBoundingClientRect').mockReturnValue(rect(width));
  document.body.appendChild(flyout);
  return flyout;
};

describe('getOpenConversationFlyoutWidth', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns nothing when the conversation flyout is not open', () => {
    expect(getOpenConversationFlyoutWidth()).toBeUndefined();
  });

  it('returns the rendered width of the system conversation flyout', () => {
    mountFlyout('agentBuilderConversationDetailsFlyout-snapshot', 480.4);
    expect(getOpenConversationFlyoutWidth()).toBe(480);
  });

  it('falls back to the in-chat conversation flyout', () => {
    mountFlyout('agentBuilderConversationDetailsFlyout-live', 512);
    expect(getOpenConversationFlyoutWidth()).toBe(512);
  });

  it('prefers the system flyout when both are in the document', () => {
    mountFlyout('agentBuilderConversationDetailsFlyout-live', 512);
    mountFlyout('agentBuilderConversationDetailsFlyout-snapshot', 480);
    expect(getOpenConversationFlyoutWidth()).toBe(480);
  });
});
