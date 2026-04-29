/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addPathParamToUrl, RETURN_APP_ID, RETURN_PATH } from '.';
import { APP_UI_ID } from '../../../../common';

describe('addPathParamToUrl', () => {
  const encodedOnboardingLink = encodeURIComponent('/onboarding');
  it('should append query parameters to a URL without existing query parameters', () => {
    const url = 'https://example.com';
    const onboardingLink = '/onboarding';
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${encodedOnboardingLink}`
    );
  });

  it('should append query parameters to a URL with existing query parameters', () => {
    const url = 'https://example.com?foo=bar';
    const onboardingLink = '/onboarding';
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?foo=bar&${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${encodedOnboardingLink}`
    );
  });

  it('should encode the onboarding link correctly', () => {
    const url = 'https://example.com';
    const onboardingLink = '/onboarding?step=1&next=2';
    const customEncodedOnboardingLink = encodeURIComponent(onboardingLink);
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${customEncodedOnboardingLink}`
    );
  });
});
