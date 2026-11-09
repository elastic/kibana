/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { hasSeenOnboarding } from '@kbn/vectordb-onboarding';
import { GETTING_STARTED_PATH } from '../common/constants';
import { AppRoutes } from './routes';

jest.mock('@kbn/vectordb-onboarding', () => ({
  ...jest.requireActual('@kbn/vectordb-onboarding'),
  hasSeenOnboarding: jest.fn(),
  OnboardingLandingPage: () => <div data-test-subj="onboardingLandingPage" />,
  IngestStep: () => <div data-test-subj="ingestStep" />,
  SearchStep: () => <div data-test-subj="searchStep" />,
}));

jest.mock('./home_page', () => ({
  HomePage: () => <div data-test-subj="homePage" />,
}));

const mockHasSeenOnboarding = jest.mocked(hasSeenOnboarding);

const onOnboardingExit = jest.fn();

const renderRoutes = (initialEntry: string): MemoryHistory => {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  render(
    <Router history={history}>
      <AppRoutes onOnboardingExit={onOnboardingExit} />
    </Router>
  );
  return history;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHasSeenOnboarding.mockReturnValue(true);
});

describe('AppRoutes', () => {
  describe('the root route', () => {
    it('renders the home page once onboarding has been seen', () => {
      mockHasSeenOnboarding.mockReturnValue(true);

      renderRoutes('/');

      expect(screen.getByTestId('homePage')).toBeInTheDocument();
    });

    it('redirects a first-time user into the wizard', () => {
      mockHasSeenOnboarding.mockReturnValue(false);

      const history = renderRoutes('/');

      expect(history.location.pathname).toBe(GETTING_STARTED_PATH);
      expect(screen.getByTestId('onboardingLandingPage')).toBeInTheDocument();
    });
  });

  describe('onOnboardingExit', () => {
    it('is not called while navigating within the wizard', () => {
      const history = renderRoutes(GETTING_STARTED_PATH);

      act(() => history.push(`${GETTING_STARTED_PATH}/ingest`));

      expect(screen.getByTestId('ingestStep')).toBeInTheDocument();
      expect(onOnboardingExit).not.toHaveBeenCalled();
    });

    it('is called when leaving the wizard', () => {
      const history = renderRoutes(`${GETTING_STARTED_PATH}/search`);

      act(() => history.push('/'));

      expect(screen.getByTestId('homePage')).toBeInTheDocument();
      expect(onOnboardingExit).toHaveBeenCalled();
    });

    it('is called when the home page renders without the wizard being entered', () => {
      renderRoutes('/');

      expect(onOnboardingExit).toHaveBeenCalledTimes(1);
    });

    it('is not called when a first-time user is redirected into the wizard', () => {
      mockHasSeenOnboarding.mockReturnValue(false);

      renderRoutes('/');

      expect(onOnboardingExit).not.toHaveBeenCalled();
    });
  });

  it('redirects unknown paths back to the root', () => {
    const history = renderRoutes('/does-not-exist');

    expect(history.location.pathname).toBe('/');
    expect(screen.getByTestId('homePage')).toBeInTheDocument();
  });
});
