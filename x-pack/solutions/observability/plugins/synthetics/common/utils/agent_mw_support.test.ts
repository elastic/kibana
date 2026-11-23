/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgentVersionMwCompatible } from './agent_mw_support';

describe('isAgentVersionMwCompatible', () => {
  it('is false for an agent version older than the MW support threshold', () => {
    expect(isAgentVersionMwCompatible('8.17.2')).toBe(false);
    expect(isAgentVersionMwCompatible('8.18.9')).toBe(false);
  });

  it('is true for an agent version at or newer than the MW support threshold', () => {
    expect(isAgentVersionMwCompatible('8.19.0')).toBe(true);
    expect(isAgentVersionMwCompatible('8.19.1')).toBe(true);
    expect(isAgentVersionMwCompatible('9.3.4')).toBe(true);
  });

  it('is true for a missing or unparsable version, to avoid false warnings', () => {
    expect(isAgentVersionMwCompatible(null)).toBe(true);
    expect(isAgentVersionMwCompatible(undefined)).toBe(true);
    expect(isAgentVersionMwCompatible('')).toBe(true);
    expect(isAgentVersionMwCompatible('not-a-version')).toBe(true);
  });

  it('is true for a compatible prerelease/build version, since a prerelease ranks below its release', () => {
    expect(isAgentVersionMwCompatible('8.19.0-SNAPSHOT')).toBe(true);
    expect(isAgentVersionMwCompatible('9.0.0-beta1')).toBe(true);
  });

  it('is false for an incompatible prerelease/build version', () => {
    expect(isAgentVersionMwCompatible('8.17.2-SNAPSHOT')).toBe(false);
  });
});
