/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useOnboardingSuccessCallout } from './use_onboarding_success_callout';

jest.mock('react-use/lib/useLocalStorage');
const mockLocalStorage = [false, jest.fn()];
const mockNavigateToApp = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
      },
    },
  }),
}));

describe('useOnboardingSuccessCallout', () => {
  beforeEach(() => {
    (useLocalStorage as jest.Mock).mockReturnValue(mockLocalStorage);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with false default value from local storage', () => {
    const { result } = renderHook(() => useOnboardingSuccessCallout());
    expect(result.current.isOnboardingSuccessCalloutVisible).toBe(false);
  });

  it('should update local storage when showOnboardingSuccessCallout is called', async () => {
    const { result } = renderHook(() => useOnboardingSuccessCallout());

    result.current.showOnboardingSuccessCallout();

    await waitFor(() => {
      expect(mockLocalStorage[1]).toHaveBeenCalledWith(true);
    });
  });

  it('should update local storage when hideOnboardingSuccessCallout is called', async () => {
    const { result } = renderHook(() => useOnboardingSuccessCallout());

    result.current.hideOnboardingSuccessCallout();

    await waitFor(() => {
      expect(mockLocalStorage[1]).toHaveBeenCalledWith(false);
    });
  });

  it('should call application.navigateToApp when onAddIntegrationClick is called', () => {
    const { result } = renderHook(() => useOnboardingSuccessCallout());

    result.current.onAddIntegrationClick();

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations');
  });
});
