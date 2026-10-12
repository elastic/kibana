/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';
import {
  ALERTING_NAV_START_TOUR_EVENT,
  AlertingNavTour,
} from './alerting_nav_tour';
import {
  ALERTING_NAV_PROMO_DISMISS_TEST_ID,
  ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID,
} from './unified_alerting_promo_card';

jest.mock('./assets/alerting_promo_light.webp', () => 'promo-light.webp');
jest.mock('./assets/alerting_promo_dark.webp', () => 'promo-dark.webp');

jest.mock('./guided_tour', () => ({
  AlertingNavGuidedTour: ({
    isActive,
    onFinish,
  }: {
    isActive: boolean;
    onFinish: () => void;
  }) =>
    isActive ? (
      <button type="button" data-test-subj="mockTourFinish" onClick={onFinish}>
        Finish tour
      </button>
    ) : null,
}));

const STORAGE_KEY = 'observability.alertingNavTour.v3';

const renderTour = ({
  appId = OBSERVABILITY_ALERTING_APP_ID,
  pathname = '/app/observabilityAlerting/alerts',
  toursEnabled = true,
}: {
  appId?: string;
  pathname?: string;
  toursEnabled?: boolean;
} = {}) => {
  window.history.pushState({}, '', pathname);
  const currentAppId$ = new BehaviorSubject<string | undefined>(appId);
  const coreStart = {
    application: { currentAppId$ },
    chrome: { sideNav: { setIsCollapsed: jest.fn() } },
    notifications: { tours: { isEnabled: () => toursEnabled } },
  } as unknown as CoreStart;

  const result = render(
    <EuiThemeProvider>
      <AlertingNavTour coreStart={coreStart} />
    </EuiThemeProvider>
  );

  return { ...result, currentAppId$ };
};

describe('AlertingNavTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows the promo on the Alerts landing path', () => {
    renderTour();

    expect(screen.getByTestId('alertingNavPromoFloatingAnchor')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Unified Alerting app' })).toBeInTheDocument();
  });

  it('hides the promo on non-Alerts Alerting paths', () => {
    renderTour({ pathname: '/app/observabilityAlerting/rules/v2' });

    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
  });

  it('hides the promo after dismiss and keeps it hidden after reload state', () => {
    const { unmount } = renderTour();

    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_DISMISS_TEST_ID));
    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"isDismissed":true');

    unmount();
    renderTour();
    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
  });

  it('dismisses the promo when Take tour starts and does not restore it after finish', () => {
    renderTour();

    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID));

    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockTourFinish')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"isDismissed":true');

    fireEvent.click(screen.getByTestId('mockTourFinish'));
    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
  });

  it('starts the tour from the window event and keeps the promo dismissed', () => {
    renderTour();

    act(() => {
      window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
    });

    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockTourFinish')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"isDismissed":true');
  });
});
