/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldRedirectToGettingStarted } from './should_redirect_to_getting_started';

const emptyOrigin = {
  absoluteTotal: 0,
  overviewSettled: true,
  overviewError: false,
  hasActiveFilter: false,
  hasExternalMonitors: false,
  cpsReady: true,
  hasLinkedProjects: false,
  statusIncludesLinkedProjects: true,
};

describe('shouldRedirectToGettingStarted', () => {
  it('redirects a settled empty origin with no CPS linked projects', () => {
    expect(shouldRedirectToGettingStarted(emptyOrigin)).toBe(true);
  });

  it('keeps the overview when local saved objects exist', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, absoluteTotal: 3 })).toBe(false);
  });

  it('keeps the overview when ping-only remotes already synthesized', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, hasExternalMonitors: true })).toBe(
      false
    );
  });

  it('does not redirect while a monitor filter is active', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, hasActiveFilter: true })).toBe(false);
  });

  it('does not redirect before overview status has settled', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, overviewSettled: false })).toBe(false);
  });

  it('does not treat a failed overview status fetch as an empty install', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, overviewError: true })).toBe(false);
  });

  it('does not redirect until CPS project list has loaded', () => {
    expect(shouldRedirectToGettingStarted({ ...emptyOrigin, cpsReady: false })).toBe(false);
  });

  it('does not onboard when linked projects exist but status did not search them', () => {
    expect(
      shouldRedirectToGettingStarted({
        ...emptyOrigin,
        hasLinkedProjects: true,
        statusIncludesLinkedProjects: false,
      })
    ).toBe(false);
  });

  it('redirects when linked projects exist but the all-projects status is empty', () => {
    expect(
      shouldRedirectToGettingStarted({
        ...emptyOrigin,
        hasLinkedProjects: true,
        statusIncludesLinkedProjects: true,
      })
    ).toBe(true);
  });
});
