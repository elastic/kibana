/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { OnboardingSuccessCallout } from './onboarding_success_callout';
import { TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT } from '../../constants';
import { renderWithTestProvider } from '../../test/test_provider';
import { userEvent } from '@testing-library/user-event';
import { mockUseOnboardingSuccessCallout } from './hooks/use_onboarding_success_callout.mock';
import { useOnboardingSuccessCallout } from './hooks/use_onboarding_success_callout';

jest.mock('./hooks/use_onboarding_success_callout');

describe('OnboardingSuccessCallout', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('does not render the callout when isCalloutVisible is false', () => {
    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue(mockUseOnboardingSuccessCallout());

    renderWithTestProvider(<OnboardingSuccessCallout />);

    expect(screen.queryByTestId(TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT)).not.toBeInTheDocument();
  });

  it('renders the callout when isCalloutVisible is true', () => {
    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue(
      mockUseOnboardingSuccessCallout({ isOnboardingSuccessCalloutVisible: true })
    );

    renderWithTestProvider(<OnboardingSuccessCallout />);

    expect(screen.getByTestId(TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT)).toBeInTheDocument();
  });

  it('calls hideCallout when the callout is dismissed', async () => {
    const mockHideCallout = jest.fn();

    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue(
      mockUseOnboardingSuccessCallout({
        hideOnboardingSuccessCallout: mockHideCallout,
        isOnboardingSuccessCalloutVisible: true,
      })
    );

    renderWithTestProvider(<OnboardingSuccessCallout />);

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() => {
      expect(mockHideCallout).toHaveBeenCalled();
    });
  });

  it('should have an "Add integration" button that calls onAddIntegrationClick when clicked', async () => {
    const mockAddIntegrationClick = jest.fn();

    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue(
      mockUseOnboardingSuccessCallout({
        isOnboardingSuccessCalloutVisible: true,
        onAddIntegrationClick: mockAddIntegrationClick,
      })
    );

    renderWithTestProvider(<OnboardingSuccessCallout />);

    await userEvent.click(screen.getByRole('button', { name: /add integration/i }));

    expect(mockAddIntegrationClick).toHaveBeenCalled();
  });
});
