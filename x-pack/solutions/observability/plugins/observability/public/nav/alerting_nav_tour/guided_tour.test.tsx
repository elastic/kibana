/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render, screen } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core/public';
import { AlertingNavGuidedTour } from './guided_tour';
import { ALERTING_NAV_TOUR_TEST_ID_PREFIX, ANCHOR_TIMEOUT_MS } from './constants';
import type { AlertingNavTourStep } from './tour_steps';

// EuiTourStep uses EuiWrappingPopover, which does not mount popover content in jsdom.
// These tests cover gating, navigation, scroll, and the missing-anchor timeout.
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

const AnchorA = () => <button type="button" data-test-subj="anchor-a" aria-label="anchor a" />;

const renderTour = (
  props: Partial<React.ComponentProps<typeof AlertingNavGuidedTour>> & {
    application?: Partial<ApplicationStart>;
  } = {}
) => {
  const navigateToApp = jest.fn().mockResolvedValue(undefined);
  const application = {
    navigateToApp,
    ...props.application,
  } as ApplicationStart;

  const result = render(
    <EuiThemeProvider>
      <AlertingNavGuidedTour
        steps={props.steps ?? STEPS}
        isActive={props.isActive ?? true}
        onFinish={props.onFinish ?? jest.fn()}
        application={application}
      />
    </EuiThemeProvider>
  );

  return { ...result, navigateToApp, application };
};

describe('AlertingNavGuidedTour', () => {
  const scrollIntoViewMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when inactive', () => {
    render(
      <EuiThemeProvider>
        <AnchorA />
        <AlertingNavGuidedTour
          steps={STEPS}
          isActive={false}
          onFinish={jest.fn()}
          application={{ navigateToApp: jest.fn() } as unknown as ApplicationStart}
        />
      </EuiThemeProvider>
    );

    expect(
      screen.queryByTestId(`${ALERTING_NAV_TOUR_TEST_ID_PREFIX}-alerts`)
    ).not.toBeInTheDocument();
  });

  it('finishes immediately when active with no steps', () => {
    const onFinish = jest.fn();
    renderTour({ steps: [], isActive: true, onFinish });
    expect(onFinish).toHaveBeenCalled();
  });

  it('does not finish while inactive even with no steps', () => {
    const onFinish = jest.fn();
    renderTour({ steps: [], isActive: false, onFinish });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('navigates to the active step app before showing the step', () => {
    const { navigateToApp } = renderTour({ steps: STEPS, isActive: true });

    expect(navigateToApp).toHaveBeenCalledWith('observabilityAlerting', {
      path: '/alerts',
      deepLinkId: undefined,
    });
  });

  it('scrolls the active step anchor into view when the tour is active', () => {
    render(
      <EuiThemeProvider>
        <AnchorA />
        <AlertingNavGuidedTour
          steps={STEPS}
          isActive
          onFinish={jest.fn()}
          application={
            { navigateToApp: jest.fn().mockResolvedValue(undefined) } as unknown as ApplicationStart
          }
        />
      </EuiThemeProvider>
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
    });
  });

  it('does not scroll when the tour is inactive', () => {
    render(
      <EuiThemeProvider>
        <AnchorA />
        <AlertingNavGuidedTour
          steps={STEPS}
          isActive={false}
          onFinish={jest.fn()}
          application={{ navigateToApp: jest.fn() } as unknown as ApplicationStart}
        />
      </EuiThemeProvider>
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('skips a step when its anchor never mounts, then finishes past the last step', () => {
    jest.useFakeTimers();
    const onFinish = jest.fn();
    const missingAnchorSteps: AlertingNavTourStep[] = [
      {
        stepId: 'alerts',
        title: 'Missing',
        anchor: '[data-test-subj="never-mounted"]',
        anchorPosition: 'rightCenter',
        content: <span>{'Missing'}</span>,
      },
    ];

    renderTour({ steps: missingAnchorSteps, isActive: true, onFinish });

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(ANCHOR_TIMEOUT_MS);
    });

    expect(onFinish).toHaveBeenCalled();
  });
});
