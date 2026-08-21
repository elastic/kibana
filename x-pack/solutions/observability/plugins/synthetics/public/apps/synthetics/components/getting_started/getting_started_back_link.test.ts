/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGettingStartedBackLink } from './getting_started_back_link';

const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;

describe('getGettingStartedBackLink', () => {
  it('returns Back to selection for observabilityOnboarding', () => {
    expect(
      getGettingStartedBackLink({
        search: '?returnAppId=observabilityOnboarding&returnPath=%3F',
        getUrlForApp,
      })
    ).toEqual({
      href: '/app/observabilityOnboarding?',
      text: 'Back to selection',
    });
  });

  it('returns undefined without return params', () => {
    expect(
      getGettingStartedBackLink({
        search: '',
        getUrlForApp,
      })
    ).toBeUndefined();
  });

  it('returns undefined for an unknown returnAppId', () => {
    expect(
      getGettingStartedBackLink({
        search: '?returnAppId=otherApp&returnPath=%2Ffoo',
        getUrlForApp,
      })
    ).toBeUndefined();
  });
});
