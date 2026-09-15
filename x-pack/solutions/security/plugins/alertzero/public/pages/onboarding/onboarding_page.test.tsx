/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { OnboardingPage } from '.';
import { useEnableOnboarding, useOnboardingState } from '../../hooks/use_onboarding_state';

jest.mock('../../hooks/use_alertzero_doc_title', () => ({
  useAlertZeroDocTitle: jest.fn(),
}));
jest.mock('../../hooks/use_onboarding_state', () => ({
  useOnboardingState: jest.fn(),
  useEnableOnboarding: jest.fn(),
}));

const mockUseOnboardingState = jest.mocked(useOnboardingState);
const mockUseEnableOnboarding = jest.mocked(useEnableOnboarding);

const defaultState = () => ({
  state: 'disabled',
  enabled: false,
  hasWatches: false,
  hasRun: false,
  isLoading: false,
  canToggle: true,
  watchesError: null,
});

const defaultEnable = () => ({
  mutate: jest.fn(),
  isLoading: false,
  isError: false,
});

const renderOnboarding = (
  state: ReturnType<typeof defaultState> = defaultState(),
  enable: ReturnType<typeof defaultEnable> = defaultEnable()
) => {
  mockUseOnboardingState.mockReturnValue(state as unknown as ReturnType<typeof useOnboardingState>);
  mockUseEnableOnboarding.mockReturnValue(enable as never);
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <OnboardingPage />
    </MemoryRouter>
  );
};

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the disabled CTA for S0', () => {
    renderOnboarding();
    expect(screen.getByTestId('alertZeroOnboardingDisabledPage')).toBeInTheDocument();
  });

  it('locks the enable toggle when the user cannot save advanced settings', () => {
    renderOnboarding({ ...defaultState(), canToggle: false });
    const toggle = screen.getByTestId('alertZeroOnboardingEnableToggle');
    expect(toggle).toBeDisabled();
    expect(screen.getByTestId('alertZeroOnboardingEnablePermissionDenied')).toBeInTheDocument();
  });

  it('calls the enable mutation when the toggle is switched on', () => {
    const mutate = jest.fn();
    renderOnboarding(defaultState(), { ...defaultEnable(), mutate });
    fireEvent.click(screen.getByTestId('alertZeroOnboardingEnableToggle'));
    expect(mutate).toHaveBeenCalled();
  });

  it('shows an error callout when enabling fails', () => {
    renderOnboarding(defaultState(), { ...defaultEnable(), isError: true });
    expect(screen.getByTestId('alertZeroOnboardingEnableError')).toBeInTheDocument();
  });

  it('renders the no-watches empty state for S1 and links to the watch catalog', () => {
    renderOnboarding({ ...defaultState(), state: 'no-watches', enabled: true });
    expect(screen.getByTestId('alertZeroOnboardingNoWatchesPage')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroOnboardingBrowseCatalog')).toBeInTheDocument();
  });

  it('renders the awaiting-first-run state for S2', () => {
    renderOnboarding({
      ...defaultState(),
      state: 'awaiting-first-run',
      enabled: true,
      hasWatches: true,
    });
    expect(screen.getByTestId('alertZeroOnboardingAwaitingRunPage')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroOnboardingGoToWatches')).toBeInTheDocument();
  });

  it('shows a loading prompt while watches/proposals are still loading', () => {
    renderOnboarding({ ...defaultState(), state: 'no-watches', isLoading: true });
    expect(screen.getByText('Checking your AlertZero setup…')).toBeInTheDocument();
  });

  it('renders the complete state once a run has happened', () => {
    renderOnboarding({ ...defaultState(), state: 'active', enabled: true, hasRun: true });
    expect(screen.getByTestId('alertZeroOnboardingCompletePage')).toBeInTheDocument();
  });
});
