/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from './analytics/constants';
import { HomepageRouter } from './router';

jest.mock('./analytics/components/home/unified_home', () => ({
  UnifiedHomePage: () => <div data-test-subj="unifiedHomePage" />,
}));
jest.mock('./analytics/components/onboarding/guided_setup', () => ({
  GuidedSetupPage: () => <div data-test-subj="guidedSetupPage" />,
}));

jest.mock('./components/web_crawls/web_crawls', () => ({
  SearchWebCrawlsPage: () => <div data-test-subj="searchWebCrawlsPage" />,
}));

describe('HomepageRouter', () => {
  const renderRouter = (path = '/') => {
    const history = createMemoryHistory({ initialEntries: [path] });
    render(
      <Router history={history}>
        <HomepageRouter />
      </Router>
    );
    return history;
  };

  const getStoredJourney = (): string | undefined =>
    JSON.parse(localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY) ?? '{}').preferredJourney;

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the home at the root', async () => {
    const history = renderRouter();

    expect(await screen.findByTestId('unifiedHomePage')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/');
    expect(screen.queryByTestId('guidedSetupPage')).not.toBeInTheDocument();
  });

  it.each([undefined, 'true'])(
    'renders the home whether or not getting started was visited (flag: %s)',
    async (flag) => {
      if (flag !== undefined) {
        localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, flag);
      }

      const history = renderRouter();

      expect(await screen.findByTestId('unifiedHomePage')).toBeInTheDocument();
      expect(history.location.pathname).toBe('/');
      expect(getStoredJourney()).toBeUndefined();
    }
  );

  it('renders the web crawls page on its route', async () => {
    const history = renderRouter('/web_crawls');

    expect(await screen.findByTestId('searchWebCrawlsPage')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/web_crawls');
    expect(screen.queryByTestId('unifiedHomePage')).not.toBeInTheDocument();
  });

  it('renders the home when local storage is unavailable', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    renderRouter();

    expect(await screen.findByTestId('unifiedHomePage')).toBeInTheDocument();
    getItem.mockRestore();
  });

  it('renders the guided setup', async () => {
    const history = renderRouter('/get_started');

    expect(await screen.findByTestId('guidedSetupPage')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/get_started');
    expect(screen.queryByTestId('unifiedHomePage')).not.toBeInTheDocument();
    expect(getStoredJourney()).toBeUndefined();
  });

  describe('legacy analytics routes', () => {
    it('redirects the analytics home to the home and remembers the analytics journey', async () => {
      const history = renderRouter('/analytics');

      expect(await screen.findByTestId('unifiedHomePage')).toBeInTheDocument();
      expect(history.location.pathname).toBe('/');
      expect(getStoredJourney()).toBe('analytics');
    });

    it('redirects the analytics onboarding to the guided setup', async () => {
      const history = renderRouter('/analytics/get_started');

      expect(await screen.findByTestId('guidedSetupPage')).toBeInTheDocument();
      expect(history.location.pathname).toBe('/get_started');
      expect(getStoredJourney()).toBe('analytics');
    });

    it('keeps the home at paths below the old routes that never existed', async () => {
      renderRouter('/analytics/unknown');

      expect(await screen.findByTestId('unifiedHomePage')).toBeInTheDocument();
      expect(getStoredJourney()).toBeUndefined();
    });
  });
});
