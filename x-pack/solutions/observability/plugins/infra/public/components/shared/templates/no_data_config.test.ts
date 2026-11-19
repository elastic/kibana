/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { getNoDataConfig, OnboardingFlow } from './no_data_config';

const HOSTS_ONBOARDING_HREF = '/app/observabilityOnboarding?category=host';

const getRedirectUrl = jest.fn().mockReturnValue(HOSTS_ONBOARDING_HREF);
const locators = {
  get: jest.fn().mockReturnValue({ getRedirectUrl }),
} as unknown as LocatorClient;

describe('getNoDataConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedirectUrl.mockReturnValue(HOSTS_ONBOARDING_HREF);
  });

  it('returns the hosts onboarding card when there is no data', () => {
    const config = getNoDataConfig({
      hasData: false,
      loading: false,
      onboardingFlow: OnboardingFlow.Hosts,
      locators,
      docsLink: 'https://docs.example',
    });

    expect(getRedirectUrl).toHaveBeenCalledWith({ category: OnboardingFlow.Hosts });
    expect(config).toEqual({
      action: {
        beats: expect.objectContaining({
          href: HOSTS_ONBOARDING_HREF,
          buttonText: 'Add data',
          docsLink: 'https://docs.example',
        }),
      },
    });
  });

  it('returns undefined while data exists or the has-data request is loading', () => {
    expect(
      getNoDataConfig({
        hasData: true,
        loading: false,
        onboardingFlow: OnboardingFlow.Hosts,
        locators,
      })
    ).toBeUndefined();
    expect(
      getNoDataConfig({
        hasData: false,
        loading: true,
        onboardingFlow: OnboardingFlow.Hosts,
        locators,
      })
    ).toBeUndefined();
  });
});
