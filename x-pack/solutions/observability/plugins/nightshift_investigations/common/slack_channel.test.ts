/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSlackChannelId, parseSlackChannelInput } from './slack_channel';

describe('isSlackChannelId', () => {
  it('accepts any channel-id-shaped value, including short ones', () => {
    expect(isSlackChannelId('C123')).toBe(true);
    expect(isSlackChannelId('#oncall')).toBe(false);
  });
});

describe('parseSlackChannelInput', () => {
  it('requires the full id length for typed input', () => {
    expect(parseSlackChannelInput('C123')).toBeUndefined();
  });

  it.each([
    ['C0123456789', 'C0123456789'],
    ['  G0123456789 ', 'G0123456789'],
    ['https://acme.slack.com/archives/C0123456789', 'C0123456789'],
    ['https://acme.slack.com/archives/C0123456789/p1700000000000000', 'C0123456789'],
    ['https://app.slack.com/client/T0123456789/C0123456789', 'C0123456789'],
  ])('parses %s', (input, expected) => {
    expect(parseSlackChannelInput(input)).toBe(expected);
  });

  it.each([
    [''],
    ['#general'],
    ['c0123456789'],
    ['http://acme.slack.com/archives/C0123456789'],
    ['https://evilslack.com/archives/C0123456789'],
    ['https://acme.slack.com/team/U0123456789'],
    ['https://acme.slack.com/archives/not-a-channel'],
  ])('rejects "%s"', (input) => {
    expect(parseSlackChannelInput(input)).toBeUndefined();
  });
});
