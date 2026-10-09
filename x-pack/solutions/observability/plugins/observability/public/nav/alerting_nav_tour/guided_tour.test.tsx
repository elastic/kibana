/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core/public';
import { AlertingNavGuidedTour, ANCHOR_TIMEOUT_MS } from './guided_tour';
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

describe('AlertingNavGuidedTour', () => {
  it('navigates to the active step app', () => {
    const navigateToApp = jest.fn().mockResolvedValue(undefined);
    render(
      <EuiThemeProvider>
        <AlertingNavGuidedTour
          steps={STEPS}
          isActive
          onFinish={jest.fn()}
          application={{ navigateToApp } as unknown as ApplicationStart}
        />
      </EuiThemeProvider>
    );

    expect(navigateToApp).toHaveBeenCalledWith('observabilityAlerting', {
      path: '/alerts',
      deepLinkId: undefined,
    });
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
