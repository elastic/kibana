/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import {
  firstAppNameFromDom,
  isOnStepLocation,
  UX_PRODUCT_TOUR_STEPS,
  UX_PRODUCT_TOUR_STORAGE_KEY,
  suffixForUxTab,
} from './tour_steps';
import { UxTourAnchor } from './ux_tour_anchor';
import { UxProductTour, UxTourProvider } from './ux_tour_context';

jest.mock('../../../hooks/use_kibana_services', () => ({
  useKibanaServices: () => ({
    notifications: { tours: { isEnabled: () => true } },
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiTourStep: ({
      'data-test-subj': testSubj,
      children,
      footerAction,
    }: {
      'data-test-subj'?: string;
      children?: React.ReactNode;
      footerAction?: React.ReactNode;
    }) =>
      testSubj ? (
        <div data-test-subj={testSubj}>
          {children}
          {footerAction}
        </div>
      ) : (
        <>{children}</>
      ),
  };
});

const renderTour = (pathname: string) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const view = render(
    <Router history={history}>
      <UxTourProvider>
        <UxTourAnchor stepId="welcome">
          <div data-test-subj="uxInventoryTitle">User Experience</div>
        </UxTourAnchor>
        <UxProductTour />
      </UxTourProvider>
    </Router>
  );
  return { history, ...view };
};

describe('UX product tour', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('starts on applications, then scoring, investigate, sessions, and AI Analyst', () => {
    expect(UX_PRODUCT_TOUR_STEPS.map((step) => step.stepId)).toEqual([
      'welcome',
      'score',
      'investigate',
      'sessions',
      'inspect',
      'filters',
      'clickMap',
      'ai',
      'funnels',
      'budgets',
      'reports',
      'alerts',
    ]);
  });

  it('maps feature tabs to in-app path suffixes', () => {
    expect(suffixForUxTab('overview')).toBe('');
    expect(suffixForUxTab('session-replay')).toBe('/session-replay');
    expect(suffixForUxTab('ai')).toBe('/ai');
    expect(suffixForUxTab('funnels')).toBe('/funnels');
    expect(suffixForUxTab('budgets')).toBe('/budgets');
    expect(suffixForUxTab('reports')).toBe('/reports');
    expect(suffixForUxTab('alerts')).toBe('/alerts');
  });

  it('treats inventory vs in-app paths as tour locations', () => {
    expect(isOnStepLocation('/', 'inventory')).toBe(true);
    expect(isOnStepLocation('/shop', 'inventory')).toBe(false);
    expect(isOnStepLocation('/shop/session-replay', 'session-replay')).toBe(true);
    expect(isOnStepLocation('/shop/ai', 'ai')).toBe(true);
  });

  it('reads the first application name from inventory links', () => {
    render(<a data-test-subj="uxAppLink-shop">shop</a>);
    expect(firstAppNameFromDom()).toBe('shop');
  });

  it('auto-starts on first visit and returns to the applications inventory', async () => {
    const { history } = renderTour('/shop/budgets');
    await waitFor(() => expect(history.location.pathname).toBe('/'));
    expect(screen.getByTestId('uxProductTourHelpButton')).toBeInTheDocument();
    expect(screen.getByTestId('uxProductTour-welcome')).toBeInTheDocument();
  });

  it('does not auto-start after the tour has been completed', () => {
    localStorage.setItem(UX_PRODUCT_TOUR_STORAGE_KEY, JSON.stringify(true));
    const { history } = renderTour('/shop/budgets');
    expect(history.location.pathname).toBe('/shop/budgets');
    expect(screen.queryByTestId('uxProductTour-welcome')).not.toBeInTheDocument();
  });

  it('restarts from the help button on the applications inventory', async () => {
    localStorage.setItem(UX_PRODUCT_TOUR_STORAGE_KEY, JSON.stringify(true));
    const { history } = renderTour('/shop/alerts');
    await userEvent.click(screen.getByTestId('uxProductTourHelpButton'));
    await waitFor(() => expect(history.location.pathname).toBe('/'));
    expect(screen.getByTestId('uxProductTour-welcome')).toBeInTheDocument();
  });

  it('stays on the current step until Next is clicked', async () => {
    jest.useFakeTimers();
    renderTour('/');
    expect(screen.getByTestId('uxProductTour-welcome')).toBeInTheDocument();
    jest.advanceTimersByTime(10_000);
    expect(screen.getByTestId('uxProductTour-welcome')).toBeInTheDocument();
    expect(screen.queryByTestId('uxProductTour-score')).not.toBeInTheDocument();
    jest.useRealTimers();
    await userEvent.click(screen.getByTestId('uxProductTourNext'));
    expect(screen.queryByTestId('uxProductTour-welcome')).not.toBeInTheDocument();
  });
});
