/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { GETTING_STARTED_PATH, hasSeenOnboarding } from '@kbn/vectordb-onboarding';
import { AppRoutes } from './routes';

vi.mock('@kbn/vectordb-onboarding', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/vectordb-onboarding')),
    hasSeenOnboarding: vi.fn(),
    OnboardingLandingPage: () => <div data-test-subj="onboardingLandingPage" />,
    IngestStep: () => <div data-test-subj="ingestStep" />,
    SearchStep: () => <div data-test-subj="searchStep" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./home/home_page', () => {
  const mocked = {
    HomePage: () => <div data-test-subj="homePage" />,
  };
  return { ...mocked, default: mocked };
});

const mockHasSeenOnboarding = vi.mocked(hasSeenOnboarding);

const renderRoutes = (initialEntry: string): MemoryHistory => {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  render(
    <Router history={history}>
      <AppRoutes />
    </Router>
  );
  return history;
};

beforeEach(() => {
  vi.clearAllMocks();
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

  it('redirects unknown paths back to the root', () => {
    const history = renderRoutes('/does-not-exist');

    expect(history.location.pathname).toBe('/');
    expect(screen.getByTestId('homePage')).toBeInTheDocument();
  });
});
