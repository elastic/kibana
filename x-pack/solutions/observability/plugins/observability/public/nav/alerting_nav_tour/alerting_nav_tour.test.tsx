/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { ALERTING_NAV_START_TOUR_EVENT, AlertingNavTour } from './alerting_nav_tour';

jest.mock('./guided_tour', () => ({
  AlertingNavGuidedTour: ({ isActive, onFinish }: { isActive: boolean; onFinish: () => void }) =>
    isActive ? (
      <button type="button" data-test-subj="mockTourFinish" onClick={onFinish}>
        Finish tour
      </button>
    ) : null,
}));

jest.mock('./tour_steps', () => ({
  getAlertingNavTourSteps: () => [],
}));

jest.mock('@kbn/alerting-v2-utils', () => ({
  isAlertingV2Enabled: jest.fn(() => true),
}));

const { isAlertingV2Enabled } = jest.requireMock('@kbn/alerting-v2-utils') as {
  isAlertingV2Enabled: jest.Mock;
};

const renderTour = ({
  toursEnabled = true,
  solutionNavId = 'oblt' as string | null,
}: {
  toursEnabled?: boolean;
  solutionNavId?: string | null;
} = {}) => {
  const coreStart = {
    application: {},
    chrome: {
      sideNav: { setIsCollapsed: jest.fn() },
      getActiveSolutionNavId: () => solutionNavId,
      getActiveSolutionNavId$: () => new BehaviorSubject(solutionNavId),
    },
    notifications: { tours: { isEnabled: () => toursEnabled } },
  } as unknown as CoreStart;

  return render(<AlertingNavTour coreStart={coreStart} />);
};

describe('AlertingNavTour', () => {
  beforeEach(() => {
    isAlertingV2Enabled.mockReturnValue(true);
  });

  it('starts the tour from the window event', () => {
    renderTour();

    act(() => {
      window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
    });

    expect(screen.getByTestId('mockTourFinish')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mockTourFinish'));
    expect(screen.queryByTestId('mockTourFinish')).not.toBeInTheDocument();
  });

  it('does not mount the tour when tours are disabled', () => {
    renderTour({ toursEnabled: false });

    act(() => {
      window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
    });

    expect(screen.queryByTestId('mockTourFinish')).not.toBeInTheDocument();
  });

  it('does not start the tour on Classic navigation', () => {
    renderTour({ solutionNavId: null });

    act(() => {
      window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
    });

    expect(screen.queryByTestId('mockTourFinish')).not.toBeInTheDocument();
  });

  it('does not start the tour when Alerting v2 is disabled', () => {
    isAlertingV2Enabled.mockReturnValue(false);
    renderTour();

    act(() => {
      window.dispatchEvent(new Event(ALERTING_NAV_START_TOUR_EVENT));
    });

    expect(screen.queryByTestId('mockTourFinish')).not.toBeInTheDocument();
  });
});
