/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSlackStubUrl } from './slack_stub';

describe('isSlackStubUrl', () => {
  it('accepts the stub of the Relay dev container, on either loopback name', () => {
    expect(isSlackStubUrl('http://127.0.0.1:3100/oauth/v2/authorize?state=1')).toBe(true);
    expect(isSlackStubUrl('http://localhost:3100/oauth/v2/authorize')).toBe(true);
  });

  it('never approves a real Slack app or another local service', () => {
    expect(isSlackStubUrl('https://slack.com/oauth/v2/authorize')).toBe(false);
    expect(isSlackStubUrl('http://localhost:3000/oauth/v2/authorize')).toBe(false);
    expect(isSlackStubUrl('http://localhost.evil.example:3100/')).toBe(false);
    expect(isSlackStubUrl('not a url')).toBe(false);
  });
});
