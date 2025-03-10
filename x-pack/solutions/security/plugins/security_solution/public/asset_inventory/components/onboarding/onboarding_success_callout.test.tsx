/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { OnboardingSuccessCallout } from './onboarding_success_callout';
import { useOnboardingSuccessCallout } from './hooks/use_onboarding_success_callout';
import { TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT } from '../../constants';
import { renderWithTestProvider } from '../../test/test_provider';
import { userEvent } from '@testing-library/user-event';

jest.mock('./hooks/use_onboarding_success_callout');

describe('OnboardingSuccessCallout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders the callout when isCalloutVisible is true', () => {
    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue({
      isCalloutVisible: true,
      onHideCallout: jest.fn(),
    });

    renderWithTestProvider(<OnboardingSuccessCallout />);

    expect(screen.getByTestId(TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT)).toBeInTheDocument();
  });

  it('does not render the callout when isCalloutVisible is false', () => {
    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue({
      isCalloutVisible: false,
      onHideCallout: jest.fn(),
    });

    renderWithTestProvider(<OnboardingSuccessCallout />);

    expect(screen.queryByTestId(TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT)).not.toBeInTheDocument();
  });

  it('calls onHideCallout when the callout is dismissed', async () => {
    const onHideCallout = jest.fn();
    (useOnboardingSuccessCallout as jest.Mock).mockReturnValue({
      isCalloutVisible: true,
      onHideCallout,
    });

    renderWithTestProvider(<OnboardingSuccessCallout />);

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onHideCallout).toHaveBeenCalled();
  });
});
