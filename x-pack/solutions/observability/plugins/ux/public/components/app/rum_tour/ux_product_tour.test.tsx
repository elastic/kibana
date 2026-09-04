/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import {
  firstAppNameFromDom,
  firstReplaySessionIdFromDom,
  isOnStepLocation,
  pathnameForTourLocation,
  UX_PRODUCT_TOUR_STEPS,
  UX_PRODUCT_TOUR_STORAGE_KEY,
  UX_SESSION_REPLAY_ROW_PREFIX,
  suffixForUxTab,
} from './tour_steps';
import { UxTourAnchor } from './ux_tour_anchor';
import { UxProductTour, UxTourProvider, useUxTour } from './ux_tour_context';

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

const renderTour = (pathname: string, children?: React.ReactNode) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const view = render(
    <Router history={history}>
      <UxTourProvider>
        {children ?? (
          <UxTourAnchor stepId="welcome">
            <div data-test-subj="uxInventoryTitle">User Experience</div>
          </UxTourAnchor>
        )}
        <UxProductTour />
      </UxTourProvider>
    </Router>
  );
  return { history, ...view };
};

function TourReplayHarness({ replayId }: { replayId?: string }) {
  const tour = useUxTour();
  useEffect(() => {
    tour?.setInventoryStatus('ready');
    if (replayId) {
      tour?.setReplayStatus('ready', replayId);
    } else {
      tour?.setReplayStatus('empty');
    }
  }, [replayId, tour]);
  return (
    <>
      <a data-test-subj="uxAppLink-shop">shop</a>
      {UX_PRODUCT_TOUR_STEPS.map((step) => (
        <UxTourAnchor key={step.stepId} stepId={step.stepId}>
          <div data-test-subj={`uxAnchor-${step.stepId}`}>{step.stepId}</div>
        </UxTourAnchor>
      ))}
    </>
  );
}

const clickNextUntil = async (stepId: string) => {
  await waitFor(() => {
    expect(screen.getByTestId('uxProductTourNext')).toBeInTheDocument();
  });
  for (let i = 0; i < UX_PRODUCT_TOUR_STEPS.length; i++) {
    if (screen.queryByTestId(`uxProductTour-${stepId}`)) {
      return;
    }
    await userEvent.click(screen.getByTestId('uxProductTourNext'));
  }
  throw new Error(`Tour never reached ${stepId}`);
};

describe('UX product tour', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('starts on applications, then scoring, investigate, sessions, player, maps, and reporting', () => {
    expect(UX_PRODUCT_TOUR_STEPS.map((step) => step.stepId)).toEqual([
      'welcome',
      'score',
      'investigate',
      'sessions',
      'inspect',
      'player',
      'playerInspect',
      'filters',
      'clickMap',
      'countryMap',
      'ai',
      'funnels',
      'budgets',
      'reports',
      'reportView',
      'scheduleEmail',
      'alerts',
    ]);
    expect(UX_PRODUCT_TOUR_STEPS.find((step) => step.stepId === 'countryMap')?.anchorPosition).toBe(
      'downLeft'
    );
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

  it('builds pathnames for player and live scorecard steps', () => {
    expect(pathnameForTourLocation('shop', 'session-player', 'abc-123')).toBe(
      '/shop/session-replay/abc-123/replay'
    );
    expect(pathnameForTourLocation('shop', 'session-player')).toBeUndefined();
    expect(pathnameForTourLocation('shop', 'report-view')).toBe('/shop/reports/scorecard');
    expect(pathnameForTourLocation('shop', 'session-replay')).toBe('/shop/session-replay');
  });

  it('treats inventory vs in-app paths as tour locations', () => {
    expect(isOnStepLocation('/', 'inventory')).toBe(true);
    expect(isOnStepLocation('/shop', 'inventory')).toBe(false);
    expect(isOnStepLocation('/shop/session-replay', 'session-replay')).toBe(true);
    expect(isOnStepLocation('/shop/session-replay/abc/replay', 'session-player')).toBe(true);
    expect(isOnStepLocation('/shop/session-replay', 'session-player')).toBe(false);
    expect(isOnStepLocation('/shop/reports/scorecard', 'report-view')).toBe(true);
    expect(isOnStepLocation('/shop/reports', 'report-view')).toBe(false);
    expect(isOnStepLocation('/shop/ai', 'ai')).toBe(true);
  });

  it('reads the first application name from inventory links', () => {
    render(<a data-test-subj="uxAppLink-shop">shop</a>);
    expect(firstAppNameFromDom()).toBe('shop');
  });

  it('reads a replay session id from the sessions table', () => {
    render(<div data-test-subj={`${UX_SESSION_REPLAY_ROW_PREFIX}sess-9`}>sess-9</div>);
    expect(firstReplaySessionIdFromDom()).toBe('sess-9');
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

  it('opens the replay player from sessions when a recording exists', async () => {
    const { history } = renderTour('/', <TourReplayHarness replayId="abc-123" />);
    await clickNextUntil('inspect');
    await userEvent.click(screen.getByTestId('uxProductTourNext'));
    await waitFor(() =>
      expect(history.location.pathname).toBe('/shop/session-replay/abc-123/replay')
    );
    expect(screen.getByTestId('uxProductTour-player')).toBeInTheDocument();
  });

  it('skips the player when no recording exists and continues to filters', async () => {
    const { history } = renderTour('/', <TourReplayHarness />);
    await clickNextUntil('inspect');
    await userEvent.click(screen.getByTestId('uxProductTourNext'));
    await waitFor(() => expect(screen.getByTestId('uxProductTour-filters')).toBeInTheDocument());
    expect(history.location.pathname).toBe('/shop');
    expect(screen.queryByTestId('uxProductTour-player')).not.toBeInTheDocument();
  });

  it('opens a live scorecard from the reporting catalog', async () => {
    const { history } = renderTour('/', <TourReplayHarness replayId="abc-123" />);
    await clickNextUntil('reports');
    await userEvent.click(screen.getByTestId('uxProductTourNext'));
    await waitFor(() => expect(history.location.pathname).toBe('/shop/reports/scorecard'));
    expect(screen.getByTestId('uxProductTour-reportView')).toBeInTheDocument();
  });
});
