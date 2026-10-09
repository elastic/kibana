/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '@kbn/significant-events-plugin/common';
import type { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';
import { DetectionPausedCallout } from './detection_paused_callout';

let mockMaintenanceStatus: Pick<ReturnType<typeof useMaintenanceStatus>, 'data'> = {
  data: undefined,
};

jest.mock('../hooks/use_significant_events_maintenance', () => ({
  useMaintenanceStatus: () => mockMaintenanceStatus,
}));

const renderCallout = () =>
  render(
    <I18nProvider>
      <DetectionPausedCallout canManageAndConfigure />
    </I18nProvider>
  );

describe('DetectionPausedCallout', () => {
  it('shows the page-level paused status with attribution', () => {
    mockMaintenanceStatus = {
      data: { state: 'paused', updatedBy: 'elastic' },
    };

    renderCallout();

    const callout = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(callout).toHaveTextContent('Detection is paused by elastic.');
    expect(callout).toHaveTextContent('Nightshift activity is stopped across the deployment');
    expect(callout).toHaveTextContent('continuous onboarding');
    expect(callout).toHaveTextContent('investigations');
  });

  it('uses the feature-flag title and explains that re-enabling does not resume', () => {
    mockMaintenanceStatus = {
      data: { state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR },
    };

    renderCallout();

    const callout = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(callout).toHaveTextContent('Paused automatically because Nightshift was turned off');
    expect(callout).toHaveTextContent('Turning Nightshift back on does not resume activity');
  });

  it('does not render while detection activity is enabled', () => {
    mockMaintenanceStatus = {
      data: { state: 'enabled' },
    };

    renderCallout();

    expect(
      screen.queryByTestId('streams-settings-maintenance-paused-status')
    ).not.toBeInTheDocument();
  });
});
