/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core/public';
import {
  AlertingNavGuidedTour,
  ANCHOR_TIMEOUT_MS,
  ALERTING_NAV_TOUR_TEST_ID_PREFIX,
} from './guided_tour';
import type { AlertingNavTourStep } from './tour_steps';

const STEPS: AlertingNavTourStep[] = [
  {
    stepId: 'alerts',
    title: 'Step A',
    anchor: '[data-test-subj="anchor-a"]',
    anchorPosition: 'rightCenter',
    content: <span>{'Content A'}</span>,
    appId: 'observabilityAlerting',
    path: '/alerts',
  },
];

const TWO_STEPS: AlertingNavTourStep[] = [
  {
    stepId: 'alerts',
    title: 'Step A',
    anchor: '[data-test-subj="anchor-a"]',
    anchorPosition: 'rightCenter',
    content: <span>{'Content A'}</span>,
    appId: 'observabilityAlerting',
    path: '/alerts',
  },
  {
    stepId: 'rules',
    title: 'Step B',
    anchor: '[data-test-subj="anchor-b"]',
    anchorPosition: 'rightCenter',
    content: <span>{'Content B'}</span>,
    appId: 'observabilityAlerting',
    path: '/rules/v2',
  },
];

/** EuiTourStep wraps/relocates anchors; keep them outside React's managed tree. */
const mountDomAnchor = (testSubj: string): HTMLElement => {
  const el = document.createElement('div');
  el.setAttribute('data-test-subj', testSubj);
  document.body.appendChild(el);
  return el;
};

describe('AlertingNavGuidedTour', () => {
  afterEach(() => {
    document
      .querySelectorAll('[data-test-subj="anchor-a"], [data-test-subj="anchor-b"]')
      .forEach((el) => el.remove());
  });

  it('expands the side nav and navigates to the active step app', () => {
    mountDomAnchor('anchor-a');
    const navigateToApp = jest.fn().mockResolvedValue(undefined);
    const setIsCollapsed = jest.fn();
    render(
      <EuiThemeProvider>
        <AlertingNavGuidedTour
          steps={STEPS}
          isActive
          onFinish={jest.fn()}
          application={{ navigateToApp } as unknown as ApplicationStart}
          sideNav={{ setIsCollapsed } as never}
        />
      </EuiThemeProvider>
    );

    expect(setIsCollapsed).toHaveBeenCalledWith(false);
    expect(navigateToApp).toHaveBeenCalledWith('observabilityAlerting', {
      path: '/alerts',
      deepLinkId: undefined,
    });
  });

  it('renders EuiTourStep and advances through mounted anchors with Next / Finish', async () => {
    mountDomAnchor('anchor-a');
    mountDomAnchor('anchor-b');
    const navigateToApp = jest.fn().mockResolvedValue(undefined);
    const onFinish = jest.fn();

    render(
      <EuiThemeProvider>
        <AlertingNavGuidedTour
          steps={TWO_STEPS}
          isActive
          onFinish={onFinish}
          application={{ navigateToApp } as unknown as ApplicationStart}
        />
      </EuiThemeProvider>
    );

    expect(
      await screen.findByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-alerts`)
    ).toBeInTheDocument();
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.getByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-next`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-next`));

    expect(
      await screen.findByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-rules`)
    ).toBeInTheDocument();
    expect(screen.getByText('Content B')).toBeInTheDocument();
    expect(screen.getByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-finish`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-finish`));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
  });

  it('does not re-navigate or restart the anchor timeout when steps are rebuilt mid-step', () => {
    jest.useFakeTimers();
    const navigateToApp = jest.fn().mockResolvedValue(undefined);
    const onFinish = jest.fn();
    const application = { navigateToApp } as unknown as ApplicationStart;
    const buildSteps = (): AlertingNavTourStep[] => [
      {
        stepId: 'alerts',
        title: 'Missing',
        anchor: '[data-test-subj="never-mounted"]',
        anchorPosition: 'rightCenter',
        content: <span>{'Missing'}</span>,
        appId: 'observabilityAlerting',
        path: '/alerts',
      },
    ];
    const renderTour = () => (
      <EuiThemeProvider>
        <AlertingNavGuidedTour
          steps={buildSteps()}
          isActive
          onFinish={onFinish}
          application={application}
        />
      </EuiThemeProvider>
    );

    const { rerender } = render(renderTour());
    act(() => {
      jest.advanceTimersByTime(ANCHOR_TIMEOUT_MS / 2);
    });
    rerender(renderTour());
    act(() => {
      jest.advanceTimersByTime(ANCHOR_TIMEOUT_MS / 2);
    });

    expect(navigateToApp).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('skips a missing anchor after the timeout, then finishes', () => {
    jest.useFakeTimers();
    const onFinish = jest.fn();
    render(
      <EuiThemeProvider>
        <AlertingNavGuidedTour
          steps={[
            {
              stepId: 'alerts',
              title: 'Missing',
              anchor: '[data-test-subj="never-mounted"]',
              anchorPosition: 'rightCenter',
              content: <span>{'Missing'}</span>,
            },
          ]}
          isActive
          onFinish={onFinish}
          application={{ navigateToApp: jest.fn() } as unknown as ApplicationStart}
        />
      </EuiThemeProvider>
    );

    expect(onFinish).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(ANCHOR_TIMEOUT_MS);
    });
    expect(onFinish).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
