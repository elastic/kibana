/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useOnboardingSuccessCallout } from './use_onboarding_success_callout';

export const mockUseOnboardingSuccessCallout = (
  overrides?: Partial<ReturnType<typeof useOnboardingSuccessCallout>>
) => {
  const defaultMock: Partial<ReturnType<typeof useOnboardingSuccessCallout>> = {
    isOnboardingSuccessCalloutVisible: false,
    hideOnboardingSuccessCallout: jest.fn(),
    showOnboardingSuccessCallout: jest.fn(),
    onAddIntegrationClick: jest.fn(),
    ...overrides,
  };
  return defaultMock;
};
