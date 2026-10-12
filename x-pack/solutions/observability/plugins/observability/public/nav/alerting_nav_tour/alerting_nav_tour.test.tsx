/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

const renderTour = ({ toursEnabled = true }: { toursEnabled?: boolean } = {}) => {
  const coreStart = {
    application: {},
    chrome: { sideNav: { setIsCollapsed: jest.fn() } },
    notifications: { tours: { isEnabled: () => toursEnabled } },
  } as unknown as CoreStart;

  return render(<AlertingNavTour coreStart={coreStart} />);
};

describe('AlertingNavTour', () => {
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
});
