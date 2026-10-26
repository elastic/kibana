/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { AlertingNavPromo } from './alerting_nav_promo';
import {
  ALERTING_NAV_PROMO_DISMISS_TEST_ID,
  ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID,
} from './unified_alerting_promo_card';
import {
  ALERTING_NAV_START_TOUR_EVENT,
  ALERTING_NAV_TOUR_STORAGE_KEY,
} from './alerting_nav_tour_state';

jest.mock('./assets/alerting_promo_light.webp', () => 'promo-light.webp');
jest.mock('./assets/alerting_promo_dark.webp', () => 'promo-dark.webp');

jest.mock('@kbn/alerting-v2-utils', () => ({
  isAlertingV2Enabled: jest.fn(() => true),
}));

const { isAlertingV2Enabled } = jest.requireMock('@kbn/alerting-v2-utils') as {
  isAlertingV2Enabled: jest.Mock;
};

const renderPromo = ({
  toursEnabled = true,
  solutionNavId = 'oblt' as string | null,
}: {
  toursEnabled?: boolean;
  solutionNavId?: string | null;
} = {}) => {
  const coreStart = {
    notifications: { tours: { isEnabled: () => toursEnabled } },
    chrome: {
      getActiveSolutionNavId: () => solutionNavId,
      getActiveSolutionNavId$: () => new BehaviorSubject(solutionNavId),
    },
  } as unknown as CoreStart;

  return render(
    <EuiThemeProvider>
      <AlertingNavPromo coreStart={coreStart} />
    </EuiThemeProvider>
  );
};

describe('AlertingNavPromo', () => {
  beforeEach(() => {
    window.localStorage.clear();
    isAlertingV2Enabled.mockReturnValue(true);
  });

  it('shows the floating promo', () => {
    renderPromo();

    expect(screen.getByTestId('alertingNavPromoFloatingAnchor')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Unified Alerting app' })).toBeInTheDocument();
  });

  it('hides the promo after dismiss and keeps it hidden after remount', () => {
    const { unmount } = renderPromo();

    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_DISMISS_TEST_ID));
    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ALERTING_NAV_TOUR_STORAGE_KEY)).toContain(
      '"isDismissed":true'
    );

    unmount();
    renderPromo();
    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
  });

  it('dismisses the promo and dispatches the start-tour event when Take tour is clicked', () => {
    const onStart = jest.fn();
    window.addEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);

    renderPromo();
    fireEvent.click(screen.getByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID));

    expect(screen.queryByTestId('alertingNavPromoFloatingAnchor')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ALERTING_NAV_TOUR_STORAGE_KEY)).toContain(
      '"isDismissed":true'
    );
    expect(onStart).toHaveBeenCalledTimes(1);

    window.removeEventListener(ALERTING_NAV_START_TOUR_EVENT, onStart);
  });

  it('hides Take tour when tours are disabled', () => {
    renderPromo({ toursEnabled: false });

    expect(screen.getByTestId('alertingNavPromoFloatingAnchor')).toBeInTheDocument();
    expect(screen.queryByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID)).not.toBeInTheDocument();
  });

  it('hides Take tour on Classic navigation', () => {
    renderPromo({ solutionNavId: null });

    expect(screen.getByTestId('alertingNavPromoFloatingAnchor')).toBeInTheDocument();
    expect(screen.queryByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID)).not.toBeInTheDocument();
  });

  it('hides Take tour when Alerting v2 is disabled', () => {
    isAlertingV2Enabled.mockReturnValue(false);
    renderPromo();

    expect(screen.getByTestId('alertingNavPromoFloatingAnchor')).toBeInTheDocument();
    expect(screen.queryByTestId(ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID)).not.toBeInTheDocument();
  });
});
